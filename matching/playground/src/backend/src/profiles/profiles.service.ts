import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Profile {
  user_id: string;
  input_text: string;
}

interface ProfilesData {
  profiles: Profile[];
}

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
    return this.profilesData.profiles.find(profile => profile.user_id === userId);
  }
} 