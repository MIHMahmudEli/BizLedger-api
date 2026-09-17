import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsTable1726600000000 implements MigrationInterface {
  name = 'AddNotificationsTable1726600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM(
        'PAYMENT_RECEIVED',
        'PROJECT_CREATED',
        'PROJECT_STATUS_CHANGED',
        'USER_CREATED',
        'USER_ROLE_CHANGED',
        'DEADLINE_APPROACHING'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "link" character varying(500),
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_isRead" ON "notifications" ("isRead")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_createdAt" ON "notifications" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
