# NestJS 11 DDD (compact, <=45 lines)

## Layers (strict)
- domain/: pure TS, no NestJS/ORM imports. Entities, VOs, domain errors.
- application/: UseCases/Commands/Handlers. Orchestrate domain+ports. No HTTP.
- infrastructure/: repositories (PrismaService), external clients/adapters.
- presentation/: thin Controllers + DTOs (class-validator). HTTP<->application.

## Rules
- Controllers: validate input, call one UseCase, return result. No business logic.
- tenantId from JWT (@CurrentTenantId), never body/query.
- DTOs: class-validator + class-transformer; ValidationPipe.
- Paths: path.join/resolve. AuthGuard where required.

## Golden Skeleton (thin controller, project style)
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenantId } from '../auth/auth.decorators';
import { GetFooUseCase } from '../application/foo/get-foo.usecase';

@ApiTags('Foo')
@Controller('foo')
export class FooController {
  constructor(private readonly getFoo: GetFooUseCase) {}
  @Get(':id')
  @ApiOperation({ summary: 'Get foo by id' })
  @ApiResponse({ status: 200, description: 'Foo' })
  get(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    return this.getFoo.execute({ tenantId, id });
  }
}