import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  async getProfile() {
    const profile = await this.prisma.schoolProfile.findFirst();
    if (!profile) {
      // Create default profile
      return this.prisma.schoolProfile.create({
        data: {
          name: 'Madrasah Diniyah',
          isInitialized: false,
        },
      });
    }
    return profile;
  }

  async updateProfile(dto: UpdateSchoolDto) {
    const profile = await this.getProfile();
    return this.prisma.schoolProfile.update({
      where: { id: profile.id },
      data: dto,
    });
  }

  async isInitialized() {
    const profile = await this.prisma.schoolProfile.findFirst();
    return profile?.isInitialized ?? false;
  }

  async updateLogo(filename: string) {
    const profile = await this.getProfile();
    return this.prisma.schoolProfile.update({
      where: { id: profile.id },
      data: { logo: filename },
    });
  }

  async markInitialized() {
    const profile = await this.getProfile();
    return this.prisma.schoolProfile.update({
      where: { id: profile.id },
      data: { isInitialized: true },
    });
  }
}
