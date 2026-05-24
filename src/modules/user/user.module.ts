import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserRepository], // AuthModule بيحتاجه
})
export class UserModule {}
