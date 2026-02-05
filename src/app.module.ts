import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { OrganizationMiddleware } from './common/middleware/organization.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    WorkspaceModule,
    LeadsModule,
    DealsModule,
    ConversationsModule,
    MessagesModule,
    WhatsappModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService, OrganizationMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(OrganizationMiddleware)
      .exclude({ path: 'users/invites/accept', method: RequestMethod.POST })
      .forRoutes(
        { path: 'organizations', method: RequestMethod.ALL },
        { path: 'organizations/(.*)', method: RequestMethod.ALL },
        { path: 'users', method: RequestMethod.ALL },
        { path: 'users/(.*)', method: RequestMethod.ALL },
        { path: 'leads', method: RequestMethod.ALL },
        { path: 'leads/(.*)', method: RequestMethod.ALL },
        { path: 'deals', method: RequestMethod.ALL },
        { path: 'deals/(.*)', method: RequestMethod.ALL },
        { path: 'conversations', method: RequestMethod.ALL },
        { path: 'conversations/(.*)', method: RequestMethod.ALL },
        { path: 'messages', method: RequestMethod.ALL },
        { path: 'messages/(.*)', method: RequestMethod.ALL },
        { path: 'whatsapp', method: RequestMethod.ALL },
        { path: 'whatsapp/(.*)', method: RequestMethod.ALL },
      );
  }
}
