import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customers log in with phone + password (no SMS code), and deleting a customer deletes their reservations.
 * `password_hash` is nullable for accounts created by the former SMS login; they set one by registering again.
 */
export class CustomerPassword1760100000000 implements MigrationInterface {
  name = 'CustomerPassword1760100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "customers" ADD "password_hash" text`);
    await q.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_customer_id"`);
    await q.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_customer_id" FOREIGN KEY ("customer_id") ` +
        `REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q.query(`DELETE FROM "otp_codes" WHERE "purpose" = 'customer_login'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "reservations" DROP CONSTRAINT "fk_reservations_customer_id"`);
    await q.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "fk_reservations_customer_id" FOREIGN KEY ("customer_id") ` +
        `REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await q.query(`ALTER TABLE "customers" DROP COLUMN "password_hash"`);
  }
}
