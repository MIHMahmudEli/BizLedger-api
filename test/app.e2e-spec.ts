import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('BizLedger API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let companyId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('POST /auth/register - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'StrongPassword123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.user.email).toBe('admin@test.com');
          adminToken = res.body.data.accessToken;
        });
    });

    it('POST /auth/register - should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Admin User 2',
          email: 'admin@test.com',
          password: 'StrongPassword123',
        })
        .expect(409);
    });

    it('POST /auth/login - should login successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'StrongPassword123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
        });
    });

    it('POST /auth/login - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('GET /auth/me - should return current user', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.email).toBe('admin@test.com');
        });
    });

    it('GET /auth/me - should reject unauthorized request', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('Companies', () => {
    it('POST /companies - should create a company', () => {
      return request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Tanha Corporation',
          category: 'Agro',
          address: '3/1 South Banashree, Dhaka',
          addressArea: 'South Banashree',
          website: 'https://www.tanhacorporation.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.companyName).toBe('Tanha Corporation');
          companyId = res.body.data.id;
        });
    });

    it('GET /companies - should return paginated companies', () => {
      return request(app.getHttpServer())
        .get('/companies?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
        });
    });

    it('GET /companies?search=tanha - should search companies', () => {
      return request(app.getHttpServer())
        .get('/companies?search=tanha')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('GET /companies/:id - should return company details', () => {
      return request(app.getHttpServer())
        .get(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.companyName).toBe('Tanha Corporation');
        });
    });

    it('PATCH /companies/:id - should update a company', () => {
      return request(app.getHttpServer())
        .patch(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category: 'Technology' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.category).toBe('Technology');
        });
    });
  });

  describe('Contacts', () => {
    let contactId: string;

    it('POST /companies/:companyId/contacts - should create a contact', () => {
      return request(app.getHttpServer())
        .post(`/companies/${companyId}/contacts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Md. Faysal',
          designation: 'Owner',
          mobile: '01711234545',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.name).toBe('Md. Faysal');
          contactId = res.body.data.id;
        });
    });

    it('GET /companies/:companyId/contacts - should return contacts', () => {
      return request(app.getHttpServer())
        .get(`/companies/${companyId}/contacts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('GET /contacts/:id - should return contact details', () => {
      return request(app.getHttpServer())
        .get(`/contacts/${contactId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.name).toBe('Md. Faysal');
        });
    });
  });

  describe('Projects', () => {
    it('POST /companies/:companyId/projects - should create a project', () => {
      return request(app.getHttpServer())
        .post(`/companies/${companyId}/projects`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectName: 'Ecommerce Website',
          projectType: 'Ecommerce',
          totalValue: 41500,
          status: 'IN_PROGRESS',
          startDate: '2026-09-01',
          deadline: '2026-10-01',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.projectName).toBe('Ecommerce Website');
          projectId = res.body.data.id;
        });
    });

    it('GET /projects - should return projects with financial data', () => {
      return request(app.getHttpServer())
        .get('/projects?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          if (res.body.data.length > 0) {
            expect(res.body.data[0].financial).toBeDefined();
            expect(res.body.data[0].financial.paymentStatus).toBe('UNPAID');
          }
        });
    });

    it('GET /projects/:id - should return project with financials', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.financial).toBeDefined();
          expect(res.body.data.financial.totalPaid).toBe('0.00');
          expect(res.body.data.financial.due).toBe('41500.00');
          expect(res.body.data.financial.paymentStatus).toBe('UNPAID');
        });
    });
  });

  describe('Payments', () => {
    let paymentId1: string;
    let paymentId2: string;

    it('POST /projects/:projectId/payments - should create first payment', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 5000,
          paymentDate: '2026-09-10',
          paymentMethod: 'CASH',
          reference: 'REC-001',
          note: 'First payment',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.amount).toBe('5000');
          paymentId1 = res.body.data.id;
        });
    });

    it('POST /projects/:projectId/payments - should create second payment', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 8000,
          paymentDate: '2026-09-15',
          paymentMethod: 'BANK_TRANSFER',
          reference: 'REC-002',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.amount).toBe('8000');
          paymentId2 = res.body.data.id;
        });
    });

    it('GET /projects/:id - should show PARTIALLY_PAID status', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.financial.totalPaid).toBe('13000.00');
          expect(res.body.data.financial.due).toBe('28500.00');
          expect(res.body.data.financial.paymentCount).toBe(2);
          expect(res.body.data.financial.paymentStatus).toBe('PARTIALLY_PAID');
        });
    });

    it('GET /payments - should return all payments', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        });
    });
  });

  describe('Reports', () => {
    it('GET /reports/dashboard - should return dashboard data', () => {
      return request(app.getHttpServer())
        .get('/reports/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.totalCompanies).toBeGreaterThanOrEqual(1);
          expect(res.body.data.totalProjects).toBeGreaterThanOrEqual(1);
        });
    });

    it('GET /reports/outstanding - should return outstanding projects', () => {
      return request(app.getHttpServer())
        .get('/reports/outstanding')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });
  });

  describe('Authorization', () => {
    it('should reject unauthorized requests', () => {
      return request(app.getHttpServer())
        .get('/companies')
        .expect(401);
    });
  });
});
