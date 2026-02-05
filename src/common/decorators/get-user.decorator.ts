import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  workspaceId: string;
  organizationId?: string | null;
  organizationMemberId?: string | null;
}

export const GetUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    // Adicionar organizationMemberId do middleware
    if (request.organizationMember) {
      user.organizationMemberId = request.organizationMember.id;
    }

    if (data) {
      return user?.[data] ?? null;
    }

    return user;
  },
);
