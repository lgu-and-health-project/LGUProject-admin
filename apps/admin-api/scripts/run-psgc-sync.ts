import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PsgcService } from '../src/psgc/psgc.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const psgcService = app.get(PsgcService);
  
  console.log('Starting PSGC bulk sync. This might take a while...');
  try {
    const syncId = await psgcService.startSync('system');
    console.log(`Sync started in background with ID: ${syncId}`);
    
    // Poll for status
    while (true) {
      await new Promise(r => setTimeout(r, 5000));
      const status = await psgcService.getSyncStatus();
      if (!status || status.status === 'COMPLETED' || status.status === 'FAILED') {
        console.log('PSGC bulk sync finished with status:', status?.status);
        if (status?.status === 'FAILED') console.error('Error details:', status.errorDetails);
        break;
      }
      console.log(`Progress: ${status.progress} records, ${status.trafficUsage} requests made`);
    }
  } catch (error) {
    console.error('Failed to sync PSGC:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
