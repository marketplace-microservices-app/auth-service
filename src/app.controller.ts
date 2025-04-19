import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RegisterUserPayload } from './types/RegisterUserPayload.interface';
import { LoginUserPayload } from './types/LoginUserPayload.interface';

@Controller('api/auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('auth.register')
  @Post('register')
  async register(@Payload() data: RegisterUserPayload) {
    return this.appService.registerUser(data);
  }

  @MessagePattern('auth.login')
  @Post('login')
  async login(@Payload() data: LoginUserPayload) {
    return this.appService.loginUser(data);
  }
}
