import { IsString, IsBoolean, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2024/2025' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2024-07-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-06-30' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['SATU', 'DUA'] })
  @IsOptional()
  @IsIn(['SATU', 'DUA'])
  activeSemester?: 'SATU' | 'DUA';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ppdbOpen?: boolean;
}

export class UpdateAcademicYearDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['SATU', 'DUA'] })
  @IsOptional()
  @IsIn(['SATU', 'DUA'])
  activeSemester?: 'SATU' | 'DUA';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ppdbOpen?: boolean;
}
