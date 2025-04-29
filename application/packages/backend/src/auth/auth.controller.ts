import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto as LoginRequestDto } from './dto/login.request.dto';
import { UserDto } from '@narrow-ai-matchmaker/common';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('')
    @HttpCode(HttpStatus.OK)
    async login(@Body() request: LoginRequestDto): Promise<UserDto> {
        return this.authService.login(request);
    }
} 