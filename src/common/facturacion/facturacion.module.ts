import { Module } from '@nestjs/common';
import { FacturacionService } from './facturacion.service';

@Module({
  providers: [FacturacionService],
  exports: [FacturacionService],
})
export class FacturacionModule {}
