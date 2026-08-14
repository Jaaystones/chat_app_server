import { Socket } from 'socket.io';
import { tokenService } from '../services/auth/token.service';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error('UNAUTHORIZED'));
    return;
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}
