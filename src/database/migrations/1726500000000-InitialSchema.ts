import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1726500000000 implements MigrationInterface {
  name = 'InitialSchema1726500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('ADMIN', 'MANAGER', 'STAFF')
    `);

    await queryRunner.query(`
      CREATE TYPE "project_status_enum" AS ENUM('PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM('CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_BANKING', 'CHEQUE', 'OTHER')
    `);

    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'STAFF',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Companies table
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyName" character varying NOT NULL,
        "category" character varying,
        "address" text,
        "addressArea" character varying,
        "website" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_companies_companyName" ON "companies" ("companyName")`);
    await queryRunner.query(`CREATE INDEX "IDX_companies_category" ON "companies" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_companies_addressArea" ON "companies" ("addressArea")`);

    // Contacts table
    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "designation" character varying,
        "mobile" character varying,
        "email" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_contacts_companyId" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_contacts_companyId" ON "contacts" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_contacts_name" ON "contacts" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_contacts_mobile" ON "contacts" ("mobile")`);

    // Projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "projectName" character varying NOT NULL,
        "projectType" character varying NOT NULL,
        "totalValue" decimal(12,2) NOT NULL DEFAULT 0,
        "status" "project_status_enum" NOT NULL DEFAULT 'PLANNED',
        "startDate" date,
        "deadline" date,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "FK_projects_companyId" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_projects_companyId" ON "projects" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_projects_projectType" ON "projects" ("projectType")`);
    await queryRunner.query(`CREATE INDEX "IDX_projects_status" ON "projects" ("status")`);

    // Payments table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL DEFAULT 0,
        "paymentDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "paymentMethod" "payment_method_enum" NOT NULL DEFAULT 'CASH',
        "reference" character varying,
        "note" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_payments_projectId" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_payments_projectId" ON "payments" ("projectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_paymentDate" ON "payments" ("paymentDate")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "project_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
