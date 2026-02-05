import {
  ForbiddenException,
  Injectable,
  type NestMiddleware,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../decorators/get-user.decorator';

@Injectable()
export class OrganizationMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async use(req: Request & any, _res: Response, next: () => void) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      return next();
    }

    let payload: JwtPayload | null = null;

    try {
      payload = this.jwtService.verify<JwtPayload>(token, { secret });
    } catch {
      return next();
    }

    if (!payload?.sub) {
      return next();
    }

    const organizationId = payload.organizationId ?? null;

    if (!organizationId) {
      return next();
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: payload.sub,
          organizationId,
        },
      },
      include: {
        organization: {
          include: { plan: true },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    req.organization = membership.organization;
    req.organizationMember = membership;

    return next();
  }
}
