import { SetMetadata } from '@nestjs/common';

export const LIMIT_KEY = 'limit_resource';
export const CheckLimit = (resource: string) => SetMetadata(LIMIT_KEY, resource);
