import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LIMIT_KEY } from '../decorators/limit.decorator';
import { OrganizationsService } from '../../modules/organizations/organizations.service';

@Injectable()
export class LimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private organizationsService: OrganizationsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const resource = this.reflector.getAllAndOverride<string>(LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organization = request.organization;

    if (!organization) {
      throw new ForbiddenException('Organization not found');
    }

    await this.organizationsService.checkLimit(organization.id, resource);
    return true;
  }
}
