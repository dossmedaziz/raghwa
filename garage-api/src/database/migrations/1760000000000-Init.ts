import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1760000000000 implements MigrationInterface {
  name = 'Init1760000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await q.query(`
      CREATE TABLE "owners" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "phone" character varying(8) NOT NULL,
        "password_hash" text NOT NULL,
        "phone_verified_at" TIMESTAMP WITH TIME ZONE,
        "notify_new_booking" boolean NOT NULL DEFAULT true,
        "notify_cancellation" boolean NOT NULL DEFAULT true,
        "notify_reschedule" boolean NOT NULL DEFAULT true,
        "notify_daily_summary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_owners_phone" UNIQUE ("phone"),
        CONSTRAINT "pk_owners" PRIMARY KEY ("id")
      )`);

    await q.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "phone" character varying(8) NOT NULL,
        "name" character varying(100),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_customers_phone" UNIQUE ("phone"),
        CONSTRAINT "pk_customers" PRIMARY KEY ("id")
      )`);

    await q.query(`
      CREATE TABLE "otp_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "phone" character varying(8) NOT NULL,
        "purpose" character varying(20) NOT NULL,
        "code_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "pk_otp_codes" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_otp_codes_phone_purpose" ON "otp_codes" ("phone", "purpose")`);

    await q.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "audience" character varying(10) NOT NULL,
        "subject_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "pk_refresh_tokens" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_refresh_tokens_audience_subject_id" ON "refresh_tokens" ("audience", "subject_id")`);

    await q.query(`
      CREATE TABLE "garages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'draft',
        "name" character varying(120) NOT NULL DEFAULT '',
        "description" text NOT NULL DEFAULT '',
        "phone" character varying(8) NOT NULL DEFAULT '',
        "address" character varying(200) NOT NULL DEFAULT '',
        "area" character varying(120) NOT NULL DEFAULT '',
        "city" character varying(60) NOT NULL DEFAULT 'Tunis',
        "latitude" double precision,
        "longitude" double precision,
        "slot_duration_minutes" integer NOT NULL DEFAULT 30,
        "capacity" integer NOT NULL DEFAULT 2,
        "published_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_garages" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_garages_owner_id" ON "garages" ("owner_id")`);
    await q.query(`CREATE INDEX "idx_garages_status_city" ON "garages" ("status", "city")`);
    await q.query(`
      CREATE INDEX "idx_garages_location" ON "garages"
      USING GIST ((ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography))
      WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL`);

    await q.query(`
      CREATE TABLE "garage_hours" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "garage_id" uuid NOT NULL,
        "day_of_week" smallint NOT NULL,
        "is_open" boolean NOT NULL,
        "opens_at" character varying(5) NOT NULL,
        "closes_at" character varying(5) NOT NULL,
        "has_break" boolean NOT NULL,
        "break_start" character varying(5) NOT NULL,
        "break_end" character varying(5) NOT NULL,
        CONSTRAINT "uq_garage_hours_garage_id_day_of_week" UNIQUE ("garage_id", "day_of_week"),
        CONSTRAINT "pk_garage_hours" PRIMARY KEY ("id")
      )`);

    await q.query(`
      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "garage_id" uuid NOT NULL,
        "name_ar" character varying(80) NOT NULL,
        "name_fr" character varying(80) NOT NULL,
        "description_ar" character varying(300) NOT NULL DEFAULT '',
        "description_fr" character varying(300) NOT NULL DEFAULT '',
        "price_millimes" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_services" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_services_garage_id" ON "services" ("garage_id")`);

    await q.query(`
      CREATE TABLE "day_blocks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "garage_id" uuid NOT NULL,
        "date" date NOT NULL,
        "reason" character varying(20) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_day_blocks_garage_id_date" UNIQUE ("garage_id", "date"),
        CONSTRAINT "pk_day_blocks" PRIMARY KEY ("id")
      )`);

    await q.query(`
      CREATE TABLE "slot_blocks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "garage_id" uuid NOT NULL,
        "date" date NOT NULL,
        "time" character varying(5) NOT NULL,
        "reason" character varying(20) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_slot_blocks_garage_id_date_time" UNIQUE ("garage_id", "date", "time"),
        CONSTRAINT "pk_slot_blocks" PRIMARY KEY ("id")
      )`);

    await q.query(`
      CREATE TABLE "reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ref" character varying(12) NOT NULL,
        "garage_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "date" date NOT NULL,
        "time" character varying(5) NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'upcoming',
        "cancelled_by" character varying(10),
        "total_millimes" integer NOT NULL,
        "car_brand" character varying(40),
        "car_model" character varying(40),
        "car_plate" character varying(20),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "uq_reservations_ref" UNIQUE ("ref"),
        CONSTRAINT "pk_reservations" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_reservations_garage_id_date_time" ON "reservations" ("garage_id", "date", "time")`);
    await q.query(`CREATE INDEX "idx_reservations_customer_id" ON "reservations" ("customer_id")`);

    await q.query(`
      CREATE TABLE "reservation_lines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reservation_id" uuid NOT NULL,
        "service_id" uuid,
        "name_ar" character varying(80) NOT NULL,
        "name_fr" character varying(80) NOT NULL,
        "price_millimes" integer NOT NULL,
        CONSTRAINT "pk_reservation_lines" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_reservation_lines_reservation_id" ON "reservation_lines" ("reservation_id")`);

    await q.query(`
      CREATE TABLE "reservation_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reservation_id" uuid NOT NULL,
        "type" character varying(15) NOT NULL,
        "actor" character varying(10),
        "previous_date" date,
        "previous_time" character varying(5),
        "at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "pk_reservation_events" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_reservation_events_reservation_id" ON "reservation_events" ("reservation_id")`);

    await q.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "garage_id" uuid NOT NULL,
        "type" character varying(30) NOT NULL,
        "reservation_id" uuid,
        "data" jsonb NOT NULL,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE INDEX "idx_notifications_garage_id_created_at" ON "notifications" ("garage_id", "created_at")`);

    const fk = (table: string, column: string, ref: string, onDelete: string) =>
      q.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "fk_${table}_${column}" FOREIGN KEY ("${column}") ` +
          `REFERENCES "${ref}"("id") ON DELETE ${onDelete} ON UPDATE NO ACTION`,
      );
    await fk('garages', 'owner_id', 'owners', 'CASCADE');
    await fk('garage_hours', 'garage_id', 'garages', 'CASCADE');
    await fk('services', 'garage_id', 'garages', 'CASCADE');
    await fk('day_blocks', 'garage_id', 'garages', 'CASCADE');
    await fk('slot_blocks', 'garage_id', 'garages', 'CASCADE');
    await fk('reservations', 'garage_id', 'garages', 'CASCADE');
    await fk('reservations', 'customer_id', 'customers', 'RESTRICT');
    await fk('reservation_lines', 'reservation_id', 'reservations', 'CASCADE');
    await fk('reservation_lines', 'service_id', 'services', 'SET NULL');
    await fk('reservation_events', 'reservation_id', 'reservations', 'CASCADE');
    await fk('notifications', 'garage_id', 'garages', 'CASCADE');
    await fk('notifications', 'reservation_id', 'reservations', 'SET NULL');
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const table of [
      'notifications', 'reservation_events', 'reservation_lines', 'reservations', 'slot_blocks', 'day_blocks',
      'services', 'garage_hours', 'garages', 'refresh_tokens', 'otp_codes', 'customers', 'owners',
    ]) {
      await q.query(`DROP TABLE "${table}"`);
    }
  }
}
