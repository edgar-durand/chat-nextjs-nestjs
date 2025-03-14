import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth.service';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient();
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new WsException('Unauthorized');
      }
      
      const user = await this.authService.getUserFromToken(token);
      
      if (!user) {
        throw new WsException('Unauthorized');
      }
      
      // Attach user to client object for later use
      client.user = user;
      
      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }
}
