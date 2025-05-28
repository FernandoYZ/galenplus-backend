import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: number[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);