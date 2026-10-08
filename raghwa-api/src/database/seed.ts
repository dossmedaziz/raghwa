import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { DEFAULT_OWNER, seedDefaultOwner } from './seeds/default-owner.seed';
import { typeormOptions } from './typeorm-options';

/** `npm run seed`: inserts development data. Safe to run repeatedly. Refuses to run in production without --force. */
async function main() {
  const env = validateEnv(process.env);
  if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed a production database (pass --force if you really mean it).');
  }
  const db = await new DataSource(typeormOptions(env)).initialize();
  try {
    const { created } = await seedDefaultOwner(db);
    console.log(`[seed] default owner ${DEFAULT_OWNER.phone} (${DEFAULT_OWNER.name}): ${created ? 'created' : 'already exists'}`);
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
