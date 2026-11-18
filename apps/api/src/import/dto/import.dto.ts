import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MapColumnsDto {
  @ApiProperty()
  @IsString()
  importJobId: string;

  @ApiProperty({
    example: {
      'Nama Lengkap': 'fullName',
      'NIK': 'nik',
      'NISN': 'nisn',
      'Jenis Kelamin': 'gender',
      'Tempat Lahir': 'birthPlace',
      'Tanggal Lahir': 'birthDate',
      'Alamat': 'address',
      'Nama Ayah': 'fatherName',
      'Nama Ibu': 'motherName',
      'No. Induk': 'studentNumber',
    },
  })
  columnMapping: Record<string, string>;
}

export class ExecuteImportDto {
  @ApiProperty()
  @IsString()
  importJobId: string;

  @ApiProperty({ enum: ['SKIP', 'INSERT', 'UPDATE'] })
  @IsEnum(['SKIP', 'INSERT', 'UPDATE'])
  mode: 'SKIP' | 'INSERT' | 'UPDATE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYearId?: string;
}
