import { Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login method for user authentication.
   * This method will handle the login logic and return the appropriate response.
   */
  @Post('login')
  public async login() {
    return this.authService.login();
  }
}
