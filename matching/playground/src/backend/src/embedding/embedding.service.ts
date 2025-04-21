import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class EmbeddingService {
  private readonly qdrantClient: QdrantClient;
  private readonly openaiClient: OpenAI;

  constructor(private readonly profilesService: ProfilesService) {
    // Initialize Qdrant client
    this.qdrantClient = new QdrantClient({ url: 'http://localhost:6333' });
    
    // Initialize OpenAI client (requires API key in environment)
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Get API key from environment variable
    });
  }

  async createEmbedding(profileId: string, collectionName: string) {
    try {
      // Find the profile by ID
      const profile = this.profilesService.findOne(profileId);
      if (!profile) {
        throw new Error(`Profile with ID ${profileId} not found`);
      }

      // Generate embedding with OpenAI
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-large', // Use the latest embedding model
        input: profile.input_text,
        encoding_format: 'float', // Get float values
      });

      const embedding = response.data[0].embedding;

      // Store embedding in Qdrant
      const result = await this.qdrantClient.upsert(collectionName, {
        wait: true,
        points: [
          {
            id: profileId,
            vector: embedding,
            payload: {
              user_id: profile.user_id,
              input_text: profile.input_text,
            },
          },
        ],
      });

      return {
        success: true,
        message: `Embedding created for profile ${profileId}`,
        profileId,
        collectionName,
        operation: result,
      };
    } catch (error) {
      console.error('Error creating embedding:', error);
      return {
        success: false,
        message: `Error creating embedding: ${error.message}`,
        profileId,
        collectionName,
      };
    }
  }
} 