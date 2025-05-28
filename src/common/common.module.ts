import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { AuditService } from './services/audit.service';
import { FacturacionModule } from './facturacion/facturacion.module';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { ItemActionsGuard } from './guards/item-actions.guard';
import { EspecialidadesGuard } from './guards/especialidades.guard';

@Global()
@Module({
  imports: [FacturacionModule],
  providers: [
    DatabaseService,
    AuditService,
    RolesGuard,
    PermissionsGuard,
    ItemActionsGuard,
    EspecialidadesGuard,
  ],
  exports: [
    DatabaseService,
    AuditService,
    FacturacionModule,
    RolesGuard,
    PermissionsGuard,
    ItemActionsGuard,
    EspecialidadesGuard,
  ],
})
export class CommonModule {}