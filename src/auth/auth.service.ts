import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Role, type User } from '@prisma/client';

export interface TokenResponse {
  access_token: string;
}

export interface AuthRegisterResponse extends TokenResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  token: string;
}

export interface ResetPasswordResponse {
  message: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthRegisterResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const plan = await this.ensureDefaultPlan();

    const workspace = await this.prisma.workspace.create({
      data: { name: `${dto.name}'s Workspace` },
    });

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
        workspaceId: workspace.id,
      },
    });

    const organizationName = `Workspace de ${dto.name}`;

    const organization = await this.prisma.organization.create({
      data: {
        name: organizationName,
        slug: await this.generateUniqueSlug(organizationName),
        planId: plan.id,
        members: {
          create: {
            userId: user.id,
            role: Role.OWNER,
          },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { activeOrganizationId: organization.id },
    });

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      organizationId: organization.id,
    });

    return {
      ...token,
      user: { id: user.id, name: user.name, email: user.email },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    };
  }

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken({
      id: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      organizationId: user.activeOrganizationId,
    });
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const token = this.generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: token,
          resetPasswordExpires: expiresAt,
        },
      });
    }

    return {
      message: 'If the email exists, a reset token was generated.',
      token,
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<ResetPasswordResponse> {
    const user = await this.validateResetToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return {
      message: 'Password reset successfully',
    };
  }

  generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  async validateResetToken(token: string): Promise<User | null> {
    const now = new Date();

    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: now,
        },
      },
    });
  }

  private generateToken(user: {
    id: string;
    email: string;
    workspaceId: string;
    organizationId?: string | null;
  }): TokenResponse {
    const payload = {
      sub: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      organizationId: user.organizationId ?? null,
    };

    return {
      access_token: this.jwt.sign(payload),
    };
  }

  private async ensureDefaultPlan() {
    let plan = await this.prisma.plan.findUnique({
      where: { name: 'start' },
    });

    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
          name: 'start',
          displayName: 'Start',
          price: '0',
          maxUsers: 2,
          maxDeals: 50,
          maxPipelines: 1,
          maxContacts: 500,
          maxAutomations: 5,
          features: ['basic_crm'],
        },
      });
    }

    return plan;
  }

  private async generateUniqueSlug(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 50);

    if (!base) {
      throw new ConflictException('Invalid organization name');
    }

    let slug = base;
    let counter = 1;

    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }

    return slug;
  }
}
