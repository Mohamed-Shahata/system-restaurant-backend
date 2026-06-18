import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CloudinaryModule } from '../../shared/cloudinary/cloudinary.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [CloudinaryModule, MailModule, JwtModule.register({})],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserRepository], // AuthModule بيحتاجه
})
export class UserModule {}
