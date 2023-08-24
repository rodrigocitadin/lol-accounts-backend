import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { AuthUser } from './types/auth-user';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) { }

  async validateUser(username: string, password: string): Promise<AuthUser> {
    const userPassword = await this.userService.givePass(username);

    if (userPassword && await bcrypt.compare(password, userPassword)) {
      const { password, ...result } = userPassword;
      return result
    }

    return null;
  }

  async login(user: AuthUser) {
    const payload = { username: user.username, sub: user.id }
    return {
      access_token: this.jwtService.sign(payload)
    }
  }
}
