import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as sql from 'mssql';
import { env } from 'src/config/env';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private poolPrincipal: sql.ConnectionPool | null = null;
  private poolExterno: sql.ConnectionPool | null = null;

  // Configuración para la base de datos principal
  private readonly envPrincipal: sql.config = {
    user: env.user,
    password: env.password,
    server: env.server,
    database: env.database,
    options: {
      encrypt: false,
      trustServerCertificate: false,
    },
    pool: {
      min: env.pool.min,
      max: env.pool.max,
      idleTimeoutMillis: env.pool.idleTimeout,
      acquireTimeoutMillis: env.pool.acquireTimeout,
      createTimeoutMillis: env.pool.createTimeout,
    },
  };

  // Configuración para la base de datos externa (solo cuando sea necesaria)
  private readonly envExterno: sql.config = {
    user: env.user,
    password: env.password,
    server: env.server,
    database: env.database2,
    options: {
      encrypt: false,
      trustServerCertificate: false,
    },
    pool: {
      min: 2, // Menor pool para DB externa
      max: 10,
      idleTimeoutMillis: env.pool.idleTimeout,
      acquireTimeoutMillis: env.pool.acquireTimeout,
      createTimeoutMillis: env.pool.createTimeout,
    },
  };

  /**
   * Obtiene la conexión a la base de datos principal
   * Esta conexión se mantiene siempre abierta
   */
  async getMainConnection(): Promise<sql.ConnectionPool> {
    try {
      if (!this.poolPrincipal) {
        this.poolPrincipal = await new sql.ConnectionPool(
          this.envPrincipal,
        ).connect();
        this.logger.log('Pool de conexión principal inicializado');
      }
      return this.poolPrincipal;
    } catch (error) {
      this.logger.error('Error al inicializar pool principal:', error);
      throw error;
    }
  }

  /**
   * Obtiene la conexión a la base de datos externa
   * Esta conexión se abre solo cuando sea necesaria
   */
  async getExternalConnection(): Promise<sql.ConnectionPool> {
    try {
      if (!this.poolExterno) {
        this.poolExterno = await new sql.ConnectionPool(
          this.envExterno,
        ).connect();
        this.logger.log('Pool de conexión externa inicializado');
      }
      return this.poolExterno;
    } catch (error) {
      this.logger.error('Error al inicializar pool externo:', error);
      throw error;
    }
  }

  /**
   * Crear una transacción en la base de datos principal
   */
  async createMainTransaction(): Promise<sql.Transaction> {
    const pool = await this.getMainConnection();
    return new sql.Transaction(pool);
  }

  /**
   * Crear una transacción en la base de datos externa
   */
  async createExternalTransaction(): Promise<sql.Transaction> {
    const pool = await this.getExternalConnection();
    return new sql.Transaction(pool);
  }

  /**
   * Verificar estado de conexiones
   */
  getConnectionStatus() {
    return {
      principal: {
        connected: this.poolPrincipal?.connected || false,
        connecting: this.poolPrincipal?.connecting || false,
      },
      externo: {
        connected: this.poolExterno?.connected || false,
        connecting: this.poolExterno?.connecting || false,
      },
    };
  }

  /**
   * Cerrar conexión externa para liberar recursos
   */
  async closeExternalConnection(): Promise<void> {
    try {
      if (this.poolExterno) {
        await this.poolExterno.close();
        this.poolExterno = null;
        this.logger.log('Pool de conexión externa cerrado');
      }
    } catch (error) {
      this.logger.error('Error al cerrar pool externo:', error);
    }
  }

  /**
   * Cerrar todas las conexiones al destruir el módulo
   */
  async onModuleDestroy(): Promise<void> {
    try {
      if (this.poolPrincipal) {
        await this.poolPrincipal.close();
        this.poolPrincipal = null;
        this.logger.log('Pool de conexión principal cerrado');
      }

      if (this.poolExterno) {
        await this.poolExterno.close();
        this.poolExterno = null;
        this.logger.log('Pool de conexión externa cerrado');
      }
    } catch (error) {
      this.logger.error('Error al cerrar pools de conexión:', error);
    }
  }
}
