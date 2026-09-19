import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDevelopers1726800000000 implements MigrationInterface {
  name = 'AddDevelopers1726800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "developer_status_enum" AS ENUM('ACTIVE', 'INACTIVE')
    `);

    await queryRunner.query(`
      CREATE TABLE "developers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "role" character varying,
        "email" character varying,
        "phone" character varying,
        "status" "developer_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "project_developers" (
        "projectId" uuid NOT NULL,
        "developerId" uuid NOT NULL,
        CONSTRAINT "PK_project_developers" PRIMARY KEY ("projectId", "developerId"),
        CONSTRAINT "FK_project_developers_projectId" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_developers_developerId" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_developers_name" ON "developers" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_developers_status" ON "developers" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_project_developers_projectId" ON "project_developers" ("projectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_project_developers_developerId" ON "project_developers" ("developerId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_developers"`);
    await queryRunner.query(`DROP TABLE "developers"`);
    await queryRunner.query(`DROP TYPE "developer_status_enum"`);
  }
}
