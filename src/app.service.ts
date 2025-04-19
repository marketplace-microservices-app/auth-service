import { HttpStatus, Injectable } from '@nestjs/common';
import { RegisterUserPayload } from './types/RegisterUserPayload.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthEntity } from './entity/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { KafkaProducerService } from './kafka/producer.service';
import { KAFKA_TOPICS } from './kafka/topics';

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
}
