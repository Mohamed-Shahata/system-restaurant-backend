import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '@prisma/client';
import { UserRepository } from '../../../modules/user/repositories/user.repository.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

/**
 * JWT authentication strategy for Passport.
 *
 * This strategy extracts JWT tokens from the Authorization Bearer header,
 * validates them, and retrieves the corresponding user from the database.
 * It is used by NestJS's AuthGuard to protect routes that require authentication.
 *
 * @class JwtStrategy
 * @extends {PassportStrategy(Strategy)}
 * @Injectable
 *
 * @example
 * // In your controller, protect routes with @UseGuards(AuthGuard('jwt'))
 * @Post('profile')
 * @UseGuards(AuthGuard('jwt'))
 * async getProfile(@Request() req) {
 *   return req.user; // User object populated by JwtStrategy
 * }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Creates an instance of the JWT strategy.
   *
   * @param {UserRepository} userRepository - Repository for user database operations
   * @param {ConfigService} configService - Service for accessing application configuration
   *
   * @remarks
   * The strategy is configured to:
   * - Extract JWT from the Authorization header as a Bearer token
   * - Reject expired tokens (ignoreExpiration: false)
   * - Use the JWT secret from configuration for token verification
   *
   * @example
   * // Expected Authorization header format:
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
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
   * Validates the JWT payload and retrieves the associated user.
   *
   * This method is automatically called by Passport after successful JWT verification.
   * The returned user object is attached to the request object (req.user) for use in route handlers.
   *
   * @param {JwtPayload} payload - The decoded JWT payload containing user identification
   * @param {string} payload.sub - The user's unique identifier (subject claim)
   * @param {string} payload.email - The user's email address
   * @param {UserRole} payload.role - The user's role (e.g., ADMIN, USER)
   *
   * @returns {Promise<User>} The full user object from the database
   *
   * @throws {UnauthorizedException} When the user associated with the token no longer exists in the database
   *
   * @remarks
   * This method performs an additional database lookup to ensure the user still exists
   * and to attach the complete user object to the request. If the user is not found,
   * an UnauthorizedException is thrown, resulting in a 401 response.
   *
   * @example
   * // Typical JWT payload structure
   * const payload = {
   *   sub: '123e4567-e89b-12d3-a456-426614174000',
   *   email: 'john@example.com',
   *   role: 'USER',
   *   iat: 1700000000,
   *   exp: 1700604800
   * };
   *
   * // The validated user is attached to the request
   * @Get('profile')
   * async getProfile(@Req() req) {
   *   console.log(req.user); // Full User object from database
   *   return req.user;
   * }
   *
   * @security
   * - Tokens must be valid and not expired
   * - The user must exist in the database (handles deleted accounts)
   * - The token's signature must match the JWT secret
   */
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
