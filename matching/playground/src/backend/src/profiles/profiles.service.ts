import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Profile, ProfilesData } from 'narrow-ai-matchmaker-common';

@Injectable()
export class ProfilesService {
  private readonly profilesData: ProfilesData;

  constructor() {
    try {
      const filePath = join(process.cwd(), '../../test_data/conference_data.json');
      const fileContent = readFileSync(filePath, 'utf8');
      this.profilesData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error loading profiles data:', error);
      this.profilesData = { profiles: [] };
    }
  }

  findAll(): ProfilesData {
    return this.profilesData;
  }

  findOne(userId: string): Profile | undefined {
    return this.profilesData.profiles.find(profile => profile.id === userId);
  }
} 