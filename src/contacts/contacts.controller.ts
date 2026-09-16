import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';
import { QueryContactDto } from './dto/query-contact.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

import { UserRole } from '../users/entities/user.entity.js';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('companies/:companyId/contacts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new contact for a company' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() createContactDto: CreateContactDto,
  ) {
    const contact = await this.contactsService.create(companyId, createContactDto);
    return { data: contact };
  }

  @Get('companies/:companyId/contacts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get contacts for a company' })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  async findAllByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: QueryContactDto,
  ) {
    return this.contactsService.findAllByCompany(companyId, query);
  }

  @Get('contacts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all contacts with optional filters' })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  async findAll(@Query() query: QueryContactDto) {
    return this.contactsService.findAll(query);
  }

  @Get('contacts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get contact details' })
  @ApiResponse({ status: 200, description: 'Contact details' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const contact = await this.contactsService.findOne(id);
    return { data: contact };
  }

  @Patch('contacts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    const contact = await this.contactsService.update(id, updateContactDto);
    return { data: contact };
  }

  @Delete('contacts/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.contactsService.remove(id);
    return { message: 'Contact deleted successfully' };
  }
}
