import { Controller, Post, Body, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common'; 
import { DevicesService } from './devices.service'; 

@Controller('api/devices') 
export class DevicesController { 
  constructor(private readonly devicesService: DevicesService) {} 
  
  @Post('pair') 
  async pairDevice(@Body() body: { token: string }) { 
    return this.devicesService.pairDevice(body.token); 
  } 
}
