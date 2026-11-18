import {
  IsString, IsEmail, IsOptional, IsDateString,
  IsEnum, IsBoolean, IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentNumber?: string;

  @ApiPropertyOptional({ description: 'NIK - 16 digit' })
  @IsOptional()
  @IsString()
  nik?: string;

  @ApiPropertyOptional({ description: 'NISN - Nomor Induk Siswa Nasional' })
  @IsOptional()
  @IsString()
  nisn?: string;

  @ApiProperty({ example: 'Ahmad Fauzi' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  @IsEnum(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthPlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  village?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kkNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED', 'DROPPED_OUT'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED', 'DROPPED_OUT'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // Parent fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherNik?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherOccupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motherNik?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motherPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motherOccupation?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nik?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nisn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthPlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  village?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kkNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED', 'DROPPED_OUT'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
