import { SetMetadata } from '@nestjs/common';

export interface ItemActionRequirement {
  itemId: number;
  actions: ('agregar' | 'modificar' | 'eliminar' | 'consultar')[];
}

export const ITEM_ACTIONS_KEY = 'item_actions';
export const RequireItemActions = (requirements: ItemActionRequirement[]) =>
  SetMetadata(ITEM_ACTIONS_KEY, requirements);