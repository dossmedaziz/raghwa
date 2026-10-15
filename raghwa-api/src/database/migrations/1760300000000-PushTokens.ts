import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Expo push tokens of the customers' phones (deleted with the customer). */
export class PushTokens1760300000000 implements MigrationInterface {
  name = 'PushTokens1760300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "push_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token" character varying(200) NOT NULL,
        "customer_id" uuid NOT NULL,
        "lang" character varying(2) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_push_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "uq_push_tokens_token" UNIQUE ("token")
      )`);
    await q.query(`CREATE INDEX "idx_push_tokens_customer_id" ON "push_tokens" ("customer_id")`);
    await q.query(
      `ALTER TABLE "push_tokens" ADD CONSTRAINT "fk_push_tokens_customer_id" FOREIGN KEY ("customer_id") ` +
        `REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "push_tokens"`);
  }
}
