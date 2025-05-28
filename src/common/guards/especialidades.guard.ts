import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class EspecialidadesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no es médico o es admin, no aplicar filtro
    if (!user?.isMedico || user?.roles?.includes(1)) {
      request.user.filtroEspecialidades = null;
      return true;
    }

    // TODO: Aquí se puede implementar lógica más compleja para cargar especialidades
    // Por ahora, usar las especialidades del token
    request.user.filtroEspecialidades = user.especialidades?.length > 0 ? user.especialidades : null;
    
    return true;
  }
}