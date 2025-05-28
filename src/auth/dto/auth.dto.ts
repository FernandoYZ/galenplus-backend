import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  @MaxLength(20, { message: 'El nombre de usuario no puede tener más de 20 caracteres.' })
  usuario: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres.' })
  contraseña: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'El token de actualización debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El token de actualización es obligatorio.' })
  refreshToken: string;
}
