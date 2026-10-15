import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsString, Max, Min, MinLength, validateSync } from 'class-validator';

const toBool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

/** Every environment variable the API reads. Validated once at startup; the app refuses to boot on bad config. */
export class Env {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  PORT = 3000;

  @IsString() @IsNotEmpty()
  APP_TIMEZONE = 'Africa/Tunis';

  @IsString()
  CORS_ORIGINS = '';

  @Transform(toBool) @IsBoolean()
  SWAGGER_ENABLED = true;

  @IsString() @IsNotEmpty()
  DB_HOST: string;

  @Type(() => Number) @IsInt()
  DB_PORT = 5432;

  @IsString() @IsNotEmpty()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString() @IsNotEmpty()
  DB_NAME: string;

  @Transform(toBool) @IsBoolean()
  DB_LOGGING = false;

  @IsString() @MinLength(32)
  JWT_OWNER_SECRET: string;

  @IsString() @MinLength(32)
  JWT_CUSTOMER_SECRET: string;

  @IsString() @MinLength(32)
  JWT_RESET_SECRET: string;

  @Type(() => Number) @IsInt() @Min(60)
  JWT_ACCESS_TTL_SECONDS = 900;

  @Type(() => Number) @IsInt() @Min(1)
  REFRESH_TOKEN_TTL_DAYS = 30;

  @Type(() => Number) @IsInt() @Min(30)
  OTP_TTL_SECONDS = 300;

  @Type(() => Number) @IsInt() @Min(1)
  OTP_MAX_ATTEMPTS = 5;

  @Type(() => Number) @IsInt() @Min(0)
  OTP_RESEND_COOLDOWN_SECONDS = 60;

  @IsIn(['console'])
  SMS_DRIVER: 'console' = 'console';

  /** "expo" sends pushes through the Expo Push Service; "console" only logs them. */
  @IsIn(['expo', 'console'])
  PUSH_DRIVER: 'expo' | 'console' = 'expo';

  /** Only needed if "Enhanced security for push notifications" is turned on in the Expo project. */
  @IsString()
  EXPO_ACCESS_TOKEN = '';

  @Type(() => Number) @IsInt() @Min(1)
  THROTTLE_LIMIT = 120;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: false });
  if (errors.length) {
    const lines = errors.map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return env;
}
