import { types } from 'pg';
import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env.validation';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';
import { SnakeNamingStrategy } from './naming.strategy';

// Keep DATE columns as "YYYY-MM-DD" strings instead of JS Dates (which would shift with the server time zone).
types.setTypeParser(types.builtins.DATE, (v) => v);

type DbEnv = Pick<Env, 'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_LOGGING'>;

/** Shared by the Nest app and the TypeORM CLI. Schema changes only ever happen through migrations. */
export function typeormOptions(env: DbEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    logging: env.DB_LOGGING,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    namingStrategy: new SnakeNamingStrategy(),
    uuidExtension: 'pgcrypto',
    synchronize: false,
    migrationsRun: false,
  };
}
