import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ITEM_ACTIONS_KEY, ItemActionRequirement } from '../decorators/item-actions.decorator';

@Injectable()
export class ItemActionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements = this.reflector.getAllAndOverride<ItemActionRequirement[]>(ITEM_ACTIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirements) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // Si es admin (rol 1), permitir todo
    if (user?.roles?.includes(1)) {
      return true;
    }

    return requirements.every((requirement) => {
      const userItemActions = user?.accionesItems?.find(
        (item: any) => item.id === requirement.itemId
      );

      if (!userItemActions) {
        return false;
      }

      return requirement.actions.every((action) => {
        switch (action) {
          case 'agregar':
            return userItemActions.a === 1;
          case 'modificar':
            return userItemActions.m === 1;
          case 'eliminar':
            return userItemActions.e === 1;
          case 'consultar':
            return userItemActions.c === 1;
          default:
            return false;
        }
      });
    });
  }
}