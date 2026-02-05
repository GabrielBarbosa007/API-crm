import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURES_KEY } from '../decorators/feature.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(
      FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organization = request.organization;

    if (!organization?.plan?.features) {
      throw new ForbiddenException('Plan features not found');
    }

    const features = organization.plan.features as string[];
    const hasAll = requiredFeatures.every((feature) => features.includes(feature));

    if (!hasAll) {
      throw new ForbiddenException('Feature not available in plan');
    }

    return true;
  }
}
