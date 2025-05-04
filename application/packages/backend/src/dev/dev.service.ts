import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DevService {
    private readonly logger = new Logger(DevService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async cleanupDatabase(): Promise<{ message: string, truncatedTables: string[] }> {
        this.logger.warn('Attempting to cleanup database (TRUNCATE ALL TABLES)');
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();

            // Get all table names in the public schema
            const tables: { tablename: string }[] = await queryRunner.query(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            );

            const truncatedTables: string[] = [];
            // Filter out the migration table and build the truncate command
            const tablesToTruncate = tables
                .map(t => t.tablename)
                .filter(tableName => tableName !== 'typeorm_migrations'); // Exclude migrations table
            
            if (tablesToTruncate.length === 0) {
                this.logger.log('No user tables found to truncate.');
                return { message: 'No user tables found to truncate.', truncatedTables: [] };
            }
            
            const tableNamesString = tablesToTruncate.map(name => `\"public\".\"${name}\"`).join(', ');
            const truncateQuery = `TRUNCATE TABLE ${tableNamesString} RESTART IDENTITY CASCADE;`;

            this.logger.warn(`Executing: ${truncateQuery}`);
            await queryRunner.query(truncateQuery);
            truncatedTables.push(...tablesToTruncate);

            this.logger.log(`Successfully truncated tables: ${truncatedTables.join(', ')}`);
            return { message: 'Database cleanup successful.', truncatedTables };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Database cleanup failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw new Error(`Database cleanup failed: ${errorMessage}`); // Re-throw a generic error
        } finally {
            await queryRunner.release();
        }
    }
} 