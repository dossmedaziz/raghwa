import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Cars saved by customers (deleted with the customer). */
export class CustomerCars1760200000000 implements MigrationInterface {
  name = 'CustomerCars1760200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "customer_cars" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "brand" character varying(40) NOT NULL,
        "model" character varying(40) NOT NULL,
        "plate" character varying(20) NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_customer_cars" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_customer_cars_customer_id" ON "customer_cars" ("customer_id")`);
    await q.query(
      `ALTER TABLE "customer_cars" ADD CONSTRAINT "fk_customer_cars_customer_id" FOREIGN KEY ("customer_id") ` +
        `REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "customer_cars"`);
  }
}
