import winston from 'winston';
import { env } from './env';

// Never log request bodies, tokens, passwords, or translation content here —
// call sites must pass only structured, non-sensitive fields.
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production' ? winston.format.json() : winston.format.simple(),
  ),
  defaultMeta: { service: 'linguabridge-backend' },
  transports: [new winston.transports.Console()],
});
