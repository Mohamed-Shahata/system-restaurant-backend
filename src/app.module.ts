import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './core/prisma/prisma.module.js';
import { AuthModule } from './core/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { MailModule } from './shared/mail/mail.module.js';
import { CloudinaryModule } from './shared/cloudinary/cloudinary.module.js';

import {
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  cloudinaryConfig,
} from './core/config/app.config.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { CategoryModule } from './modules/categories/category.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        mailConfig,
        cloudinaryConfig,
      ],
    }),
    PrismaModule,
    MailModule,
    CloudinaryModule,
    UserModule,
    AuthModule,
    CategoryModule,
    MenuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
