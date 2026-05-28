import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './core/prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MailModule } from './shared/mail/mail.module';
import { CloudinaryModule } from './shared/cloudinary/cloudinary.module';

import {
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  cloudinaryConfig,
} from './core/config/app.config';
import { MenuModule } from './modules/menu/menu.module';
import { CategoryModule } from './modules/categories/category.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AddonsModule } from './modules/addons/addons.module';
import { SizesModule } from './modules/sizes/sizes.module';

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
    FavoritesModule,
    MenuModule,
    AddonsModule,
    SizesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
