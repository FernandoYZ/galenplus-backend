import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import {
  BuscarPacienteDto,
  ValidarPacienteDto,
  ActualizarDatosAdicionalesDto,
} from './dto/pacientes.dto';
import {
  CurrentUser,
  CurrentUserData,
  ApiResponse,
  RequireItemActions,
  ItemActionsGuard,
  ITEMS,
} from '../common';
import { UseGuards } from '@nestjs/common';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  /**
   * Validar paciente por documento (compatibilidad con Express)
   * GET /api/pacientes/validar?NroDocumento=12345678
   */
  @Get('validar')
  async validarPaciente(
    @Query() query: ValidarPacienteDto,
  ): Promise<ApiResponse> {
    try {
      const resultado = await this.pacientesService.validarPaciente(
        query.NroDocumento,
      );

      return {
        success: resultado.existePaciente,
        message: resultado.mensaje,
        data: {
          tieneSHC: resultado.tieneSHC,
          idPaciente: resultado.paciente?.idPaciente,
          tipoDocumento: resultado.paciente?.tipoDocumento,
          nroDocumento: resultado.paciente?.nroDocumento,
          nombre: resultado.paciente?.nombre,
          apellidos: resultado.paciente?.apellidos,
          fechaNacimiento: resultado.paciente?.fechaNacimiento,
          nroHistoriaClinica: resultado.paciente?.nroHistoriaClinica,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }
  }

  /**
   * Buscar paciente por documento con datos completos
   * GET /api/pacientes/buscar?nroDocumento=12345678
   */
  @Get('buscar')
  async buscarPorDocumento(
    @Query() dto: BuscarPacienteDto,
  ): Promise<ApiResponse> {
    const paciente = await this.pacientesService.buscarPacientePorDocumento(
      dto.nroDocumento,
    );

    if (!paciente) {
      return {
        success: false,
        message: 'Paciente no encontrado',
      };
    }

    return {
      success: true,
      message: 'Paciente encontrado',
      data: paciente,
    };
  }

  /**
   * Obtener paciente por ID
   * GET /api/pacientes/:id
   */
  @Get(':id')
  async obtenerPorId(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    const paciente = await this.pacientesService.obtenerPacientePorId(id);

    if (!paciente) {
      return {
        success: false,
        message: 'Paciente no encontrado',
      };
    }

    return {
      success: true,
      data: paciente,
    };
  }

  /**
   * Buscar pacientes para autocompletado
   * GET /api/pacientes/search?termino=juan&limite=10
   */
  @Get('search/autocompletar')
  async buscarPacientes(
    @Query('termino') termino: string,
    @Query('limite') limite?: number,
  ): Promise<ApiResponse> {
    const pacientes = await this.pacientesService.buscarPacientes(
      termino,
      limite ? parseInt(limite.toString()) : 10,
    );

    return {
      success: true,
      data: pacientes,
    };
  }

  /**
   * Obtener datos adicionales del paciente
   * GET /api/pacientes/:id/datos-adicionales
   */
  @Get(':id/datos-adicionales')
  async obtenerDatosAdicionales(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    const datos = await this.pacientesService.obtenerDatosAdicionales(id);

    return {
      success: true,
      data: datos,
    };
  }

  /**
   * Actualizar datos adicionales del paciente
   * PUT /api/pacientes/:id/datos-adicionales
   */
  @Put(':id/datos-adicionales')
  @UseGuards(ItemActionsGuard)
  @RequireItemActions([{ itemId: ITEMS.PACIENTE, actions: ['modificar'] }])
  @HttpCode(HttpStatus.OK)
  async actualizarDatosAdicionales(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarDatosAdicionalesDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponse> {
    await this.pacientesService.actualizarDatosAdicionales(id, datos, user.id);

    return {
      success: true,
      message: 'Datos adicionales actualizados correctamente',
    };
  }

  /**
   * Obtener condición materna según sexo del paciente
   * GET /api/pacientes/:id/condicion-materna
   */
  @Get(':id/condicion-materna')
  async obtenerCondicionMaterna(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    const opciones = await this.pacientesService.obtenerCondicionMaterna(id);

    return {
      success: true,
      data: opciones,
    };
  }
}
