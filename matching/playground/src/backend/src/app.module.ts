import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {EmbeddingController} from './embedding/embedding.controller';
import {EmbeddingService} from './embedding/embedding.service';
import {TestDataModule} from './test-data/test-data.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '../../../../../.env',
        }),
        TestDataModule,
    ],
    controllers: [EmbeddingController],
    providers: [EmbeddingService],
})
export class AppModule {
}