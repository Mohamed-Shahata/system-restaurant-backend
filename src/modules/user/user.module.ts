import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';

@Module({
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserRepository], // AuthModule بيحتاجه
})
export class UserModule {}
