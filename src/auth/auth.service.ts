import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as sql from 'mssql';
import { DatabaseService, AuditService, handleSqlError } from '../common';
import { JwtPayload, UserPayload } from './interfaces/auth.interface';
import { LoginDto } from './dto/auth.dto';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(usuario: string, contraseña: string): Promise<UserPayload | null> {
    try {
      const pool = await this.databaseService.getMainConnection();

      if (!usuario || !contraseña) {
        throw new UnauthorizedException('Usuario y contraseña son requeridos');
      }

      // 1. Obtener datos de usuario
      const result = await pool
        .request()
        .input('Usuario', sql.VarChar(20), usuario)
        .query(`
          SELECT 
            e.IdEmpleado, 
            Usuario,
            RTRIM(LTRIM(DNI)) as DNI,
            Nombres,
            ApellidoPaterno,
            ISNULL(m.IdMedico, 0) AS IdMedico,
            Password
          FROM Empleados e
          LEFT JOIN Medicos m ON e.IdEmpleado = m.IdEmpleado
          WHERE Usuario = @Usuario
        `);

      const user = result.recordset[0];
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Verificar contraseña
      const contraHash = await bcrypt.compare(contraseña, user.Password);
      if (!contraHash) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }

      const IdMedico = user.IdMedico;

      // 2. Obtener roles del usuario (solo IDs para JWT)
      const rolesResult = await pool
        .request()
        .input('IdEmpleado', sql.Int, user.IdEmpleado)
        .query(`
          SELECT r.IdRol, r.Nombre AS NombreRol
          FROM UsuariosRoles ur
          INNER JOIN Roles r ON ur.IdRol = r.IdRol
          WHERE ur.IdEmpleado = @IdEmpleado
        `);

      const roles = rolesResult.recordset.map((r) => ({
        id: r.IdRol,
        nombre: r.NombreRol,
      }));

      // 3. Obtener permisos (para datos completos, no JWT)
      const permisosResult = await pool
        .request()
        .input('IdEmpleado', sql.Int, user.IdEmpleado)
        .query(`
          SELECT DISTINCT rp.IdPermiso
          FROM RolesPermisos rp
          INNER JOIN UsuariosRoles ur ON rp.IdRol = ur.IdRol
          WHERE ur.IdEmpleado = @IdEmpleado
        `);

      const permisos = permisosResult.recordset.map((p) => p.IdPermiso);

      // 4. Obtener acciones (para datos completos, no JWT)
      const accionesResult = await pool
        .request()
        .input('IdEmpleado', sql.Int, user.IdEmpleado)
        .query(`
          SELECT DISTINCT ri.IdListItem, ri.Agregar, ri.Modificar, ri.Eliminar, ri.Consultar
          FROM RolesItems ri
          INNER JOIN UsuariosRoles ur ON ri.IdRol = ur.IdRol
          WHERE ur.IdEmpleado = @IdEmpleado
        `);

      const acciones = accionesResult.recordset.map((a) => ({
        idItem: a.IdListItem,
        agregar: !!a.Agregar,
        modificar: !!a.Modificar,
        eliminar: !!a.Eliminar,
        consultar: !!a.Consultar,
      }));

      // 5. Especialidades (solo IDs)
      let especialidades = [];
      let idMedico = null;

      if (user.IdMedico > 0) {
        idMedico = user.IdMedico;

        const espResult = await pool
          .request()
          .input('IdMedico', sql.Int, idMedico)
          .query(`
            SELECT DISTINCT s.IdServicio
            FROM ProgramacionMedica pm
            INNER JOIN Servicios s ON pm.IdServicio = s.IdServicio
            WHERE pm.IdMedico = @IdMedico
            AND s.IdServicio IN (145, 149, 230, 312, 346, 347, 358, 367, 407, 439)
          `);

        especialidades = espResult.recordset.map((e) => e.IdServicio);
      }

      return {
        sub: user.IdEmpleado,
        id: user.IdEmpleado,
        idMedico: idMedico,
        nombre: user.Nombres,
        apellido: user.ApellidoPaterno,
        isMedico: user.IdMedico > 0,
        roles: roles.map((r) => r.id),
        rolesNombre: roles.map((s) => s.nombre),
        permisos: permisos,
        accionesItems: acciones.map((a) => ({
          id: a.idItem,
          a: a.agregar ? 1 : 0,
          m: a.modificar ? 1 : 0,
          e: a.eliminar ? 1 : 0,
          c: a.consultar ? 1 : 0,
        })),
        especialidades: especialidades,
      };
    } catch (error) {
      this.logger.error('Error en validación de usuario:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      handleSqlError(error);
    }
  }

  async login(loginDto: LoginDto): Promise<{ 
    user: UserPayload; 
    accessToken: string; 
    refreshToken: string;
    tokenSize: number;
  }> {
    const user = await this.validateUser(loginDto.usuario, loginDto.contraseña);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // OPTIMIZED: JWT payload más pequeño (solo lo esencial)
    const jwtPayload: JwtPayload = {
      sub: user.id,
      idMedico: user.idMedico,
      isMedico: user.isMedico,
      roles: user.roles, // Solo IDs
    };
    
    const accessToken = this.jwtService.sign(jwtPayload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id }, // Refresh token aún más pequeño
      { expiresIn: '7d' }
    );

    // Debug: mostrar tamaño del token
    const tokenSize = Buffer.byteLength(accessToken, 'utf8');

    this.logger.log(`Usuario ${user.nombre} inició sesión correctamente`);

    return {
      user,
      accessToken,
      refreshToken,
      tokenSize,
    };
  }

  // NUEVO: Método para obtener datos completos del usuario por ID
  async getUserCompleteData(userId: number): Promise<UserPayload | null> {
    try {
      const pool = await this.databaseService.getMainConnection();

      // Obtener datos básicos
      const userResult = await pool
        .request()
        .input('IdEmpleado', sql.Int, userId)
        .query(`
          SELECT 
            e.IdEmpleado, 
            e.Nombres,
            e.ApellidoPaterno,
            ISNULL(m.IdMedico, 0) AS IdMedico
          FROM Empleados e
          LEFT JOIN Medicos m ON e.IdEmpleado = m.IdEmpleado
          WHERE e.IdEmpleado = @IdEmpleado
        `);

      if (!userResult.recordset.length) {
        return null;
      }

      const user = userResult.recordset[0];

      // Obtener roles
      const rolesResult = await pool
        .request()
        .input('IdEmpleado', sql.Int, userId)
        .query(`
          SELECT r.IdRol, r.Nombre AS NombreRol
          FROM UsuariosRoles ur
          INNER JOIN Roles r ON ur.IdRol = r.IdRol
          WHERE ur.IdEmpleado = @IdEmpleado
        `);

      const roles = rolesResult.recordset;

      // Obtener permisos
      const permisosResult = await pool
        .request()
        .input('IdEmpleado', sql.Int, userId)
        .query(`
          SELECT DISTINCT rp.IdPermiso
          FROM RolesPermisos rp
          INNER JOIN UsuariosRoles ur ON rp.IdRol = ur.IdRol
          WHERE ur.IdEmpleado = @IdEmpleado
        `);

      // Obtener acciones
      const accionesResult = await pool
        .request()
        .input('IdEmpleado', sql.Int, userId)
        .query(`
          SELECT DISTINCT ri.IdListItem, ri.Agregar, ri.Modificar, ri.Eliminar, ri.Consultar
          FROM RolesItems ri
          INNER JOIN UsuariosRoles ur ON ri.IdRol = ur.IdRol
          WHERE ur.IdEmpleado = @IdEmpleado
        `);

      // Obtener especialidades si es médico
      let especialidades = [];
      if (user.IdMedico > 0) {
        const espResult = await pool
          .request()
          .input('IdMedico', sql.Int, user.IdMedico)
          .query(`
            SELECT DISTINCT s.IdServicio
            FROM ProgramacionMedica pm
            INNER JOIN Servicios s ON pm.IdServicio = s.IdServicio
            WHERE pm.IdMedico = @IdMedico
            AND s.IdServicio IN (145, 149, 230, 312, 346, 347, 358, 367, 407, 439)
          `);

        especialidades = espResult.recordset.map((e) => e.IdServicio);
      }

      return {
        sub: user.IdEmpleado,
        id: user.IdEmpleado,
        idMedico: user.IdMedico > 0 ? user.IdMedico : null,
        nombre: user.Nombres,
        apellido: user.ApellidoPaterno,
        isMedico: user.IdMedico > 0,
        roles: roles.map((r) => r.IdRol),
        rolesNombre: roles.map((r) => r.NombreRol),
        permisos: permisosResult.recordset.map((p) => p.IdPermiso),
        accionesItems: accionesResult.recordset.map((a) => ({
          id: a.IdListItem,
          a: a.Agregar ? 1 : 0,
          m: a.Modificar ? 1 : 0,
          e: a.Eliminar ? 1 : 0,
          c: a.Consultar ? 1 : 0,
        })),
        especialidades: especialidades,
      };
    } catch (error) {
      this.logger.error('Error al obtener datos completos del usuario:', error);
      return null;
    }
  }

  async logout(userId: number): Promise<void> {
    await this.auditService.registrarAuditoria({
      idEmpleado: userId,
      accion: 'C',
      idRegistro: userId,
      tabla: 'Logout',
      observaciones: 'Cierre de sesión',
    });

    this.logger.log(`Usuario ${userId} cerró sesión`);
  }

  async validateToken(payload: JwtPayload): Promise<UserPayload> {
    // Obtener datos completos del usuario desde la BD
    const userData = await this.getUserCompleteData(payload.sub);
    
    if (!userData) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return userData;
  }

  generateAccessToken(user: JwtPayload): string {
    return this.jwtService.sign(user);
  }

  generateRefreshToken(userId: number): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }
}