import { DefaultNamingStrategy, type NamingStrategyInterface, type Table } from 'typeorm';

const snake = (s: string) =>
  s
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

const tableOf = (t: Table | string) => (typeof t === 'string' ? t : t.name).split('.').pop()!;

/**
 * snake_case columns plus readable, deterministic constraint names (`fk_reservations_garage_id`)
 * so hand-written migrations and `migration:generate` agree on every name.
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? snake(targetName);
  }

  override columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return snake(embeddedPrefixes.concat(customName ? customName : propertyName).join('_'));
  }

  override relationName(propertyName: string): string {
    return snake(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snake(`${relationName}_${referencedColumnName}`);
  }

  override primaryKeyName(tableOrName: Table | string): string {
    return `pk_${tableOf(tableOrName)}`;
  }

  override uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string {
    return `uq_${tableOf(tableOrName)}_${columnNames.join('_')}`;
  }

  override foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return `fk_${tableOf(tableOrName)}_${columnNames.join('_')}`;
  }

  override indexName(tableOrName: Table | string, columnNames: string[]): string {
    return `idx_${tableOf(tableOrName)}_${columnNames.join('_')}`;
  }
}
