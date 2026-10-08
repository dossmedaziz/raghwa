import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { typeormOptions } from './typeorm-options';

// Used only by the TypeORM CLI (`npm run migration:*`). Reads the same variables as the app.
// Load a .env file with `node --env-file=.env`, or export the variables in your shell / docker-compose.
export default new DataSource(typeormOptions(validateEnv(process.env)));
