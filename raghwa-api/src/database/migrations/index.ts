import { Init1760000000000 } from './1760000000000-Init';
import { CustomerPassword1760100000000 } from './1760100000000-CustomerPassword';
import { CustomerCars1760200000000 } from './1760200000000-CustomerCars';
import { PushTokens1760300000000 } from './1760300000000-PushTokens';

/** Every migration, in order. Listed explicitly (no glob) so it works the same in `dist/`, ts-jest and the CLI. */
export const MIGRATIONS = [Init1760000000000, CustomerPassword1760100000000, CustomerCars1760200000000, PushTokens1760300000000];
