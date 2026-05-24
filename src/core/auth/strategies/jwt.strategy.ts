import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../../../modules/user/repositories/user.repository';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { IUser } from '../../../modules/user/interfaces/user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userRepository: UserRepository,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') as string,
    });
  }

  /**
   * بيرجع IUser مش Prisma User —
   * ده اللي بيتحط في req.user ويتبعت لـ @CurrentUser()
   */
  async validate(payload: JwtPayload): Promise<IUser> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
