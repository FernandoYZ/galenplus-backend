import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class BuscarPacienteDto {
  @IsString({ message: 'El número de documento debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  @Length(8, 12, {
    message: 'El número de documento debe tener entre 8 y 12 caracteres.',
  })
  nroDocumento: string;
}

export class ValidarPacienteDto {
  @IsString({ message: 'El número de documento debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  @Length(8, 12, {
    message: 'El número de documento debe tener entre 8 y 12 caracteres.',
  })
  NroDocumento: string;
}

export class ActualizarDatosAdicionalesDto {
  @IsOptional()
  @IsString({ message: 'Los antecedentes personales deben ser una cadena de texto.' })
  antecedentes?: string;

  @IsOptional()
  @IsString({ message: 'El antecedente alérgico debe ser una cadena de texto.' })
  antecedAlergico?: string;

  @IsOptional()
  @IsString({ message: 'El antecedente obstétrico debe ser una cadena de texto.' })
  antecedObstetrico?: string;

  @IsOptional()
  @IsString({ message: 'El antecedente quirúrgico debe ser una cadena de texto.' })
  antecedQuirurgico?: string;

  @IsOptional()
  @IsString({ message: 'El antecedente familiar debe ser una cadena de texto.' })
  antecedFamiliar?: string;

  @IsOptional()
  @IsString({ message: 'El antecedente patológico debe ser una cadena de texto.' })
  antecedPatologico?: string;
}
