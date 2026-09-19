import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyContactFields1726700000000 implements MigrationInterface {
  name = 'AddCompanyContactFields1726700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "contactName" character varying`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "designation" character varying`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "phone" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "designation"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "contactName"`);
  }
}
