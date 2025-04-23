import { HttpStatus, Injectable } from '@nestjs/common';
import { RegisterUserPayload } from './types/RegisterUserPayload.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthEntity } from './entity/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { KafkaProducerService } from './kafka/producer.service';
import { KAFKA_TOPICS } from './kafka/topics';
import { LoginUserPayload } from './types/LoginUserPayload.interface';
import * as jwt from 'jsonwebtoken';
@Injectable()
export class AppService {
  constructor(
    @InjectRepository(AuthEntity)
    private _authEntity: Repository<AuthEntity>,
    private _kafkaProducerService: KafkaProducerService,
  ) {}

  async registerUser(data: RegisterUserPayload) {
    // Step 1 - Get only the auth data
    const { email, password, firstName, lastName, role } = data;

    // Check whether the User is already existing
    const isExist = await this._authEntity.findOneBy({ email });

    if (isExist) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `User already exists!`,
      };
    }

    // Step 2 - Password Hashing using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Step 3 - Save the User to authData table
    const newUser = {
      email: email,
      password: passwordHash,
      role: role,
    };

    const response = await this._authEntity.save(newUser);

    // Step 4 - If success, notify to users service
    if (response) {
      // Send Kafka message to Users service - user.created
      let message = {
        userId: response.id,
        firstName,
        lastName,
        role,
        country: data?.country ? data.country : null,
      };

      await this._kafkaProducerService
        .sendMessage(KAFKA_TOPICS.USER_CREATED, [
          {
            key: String(response?.id),
            value: JSON.stringify(message),
          },
        ])
        .catch((err) => {
          throw err;
        });

      return {
        status: HttpStatus.CREATED,
        message: `User created Successfully`,
      };
    } else {
      // Step 5 - If not, handle the error
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `User creation failed, Something went wrong.`,
      };
    }
  }

  async loginUser(data: LoginUserPayload) {
    const { email, password } = data;

    // Check whether the User is existing
    const user = await this._authEntity.findOneBy({ email });

    if (!user) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `No User found for provided email!`,
      };
    }

    // Check Password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: `Provided Credentials are wrong! Please Try Again`,
      };
    }

    //  Generate JWT Token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Access Token
    const accessToken = jwt.sign(payload, 'accessSecretKey', {
      expiresIn: '15m',
    });

    // Refresh Token
    const refreshToken = jwt.sign(payload, 'refreshSecretKey', {
      expiresIn: '7d',
    });

    return {
      status: HttpStatus.OK,
      message: 'Login Successful',
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = jwt.verify(token, 'refreshSecretKey');

      const user = await this._authEntity.findOneBy({ id: payload.sub });
      if (!user || !token) {
        throw new Error('Invalid refresh token');
      }

      const newAccessToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        'accessSecretKey',
        { expiresIn: '15m' },
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      return {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Refresh token invalid or expired',
      };
    }
  }
}
