import { Init1760000000000 } from './1760000000000-Init';
import { CustomerPassword1760100000000 } from './1760100000000-CustomerPassword';

/** Every migration, in order. Listed explicitly (no glob) so it works the same in `dist/`, ts-jest and the CLI. */
export const MIGRATIONS = [Init1760000000000, CustomerPassword1760100000000];
