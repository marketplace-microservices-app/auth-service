import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auth_data')
export class AuthEntity {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;
}
