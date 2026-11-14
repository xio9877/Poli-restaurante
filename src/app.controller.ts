import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Poli Restaurante API is running!';
  }

  @Get('api')
  getApiInfo() {
    return {
      name: 'Poli Restaurante API',
      version: '1.0.0',
      description: 'Sistema de gestión de restaurante',
      swagger: '/api',
      health: '/health',
    };
  }
}
