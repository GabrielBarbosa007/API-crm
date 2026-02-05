import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    return Boolean(request.organization);
  }
}
