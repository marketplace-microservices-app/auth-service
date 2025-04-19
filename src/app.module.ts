import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthEntity } from './entity/user.entity';
import { KafkaModule } from './kafka/kafka.module';
import { KafkaProducerService } from './kafka/producer.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '123',
      database: 'users',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forFeature([AuthEntity]),
    KafkaModule,
  ],
  controllers: [AppController],
  providers: [AppService, KafkaProducerService],
})
export class AppModule {}
