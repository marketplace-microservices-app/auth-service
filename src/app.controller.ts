import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('api/auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('auth.register')
  @Post('register')
  async register(@Payload() data: { email: string; password: string }) {
    console.log('Registering user:', data);

    // return sample data
    return {
      message: 'User created successfully',
      user: {
        email: data.email,
        id: Math.floor(Math.random() * 1000),
      },
    };
  }
}
