import { Controller, Body, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOkResponse, ApiOperation, ApiUnauthorizedResponse, ApiTags } from '@nestjs/swagger';
import { SignInDto } from './SignInDto';
import { Public } from 'src/decorator/decorator';
import { CreateUserDto } from 'src/module/user/dto/createUser.dto';


@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}

    @ApiOperation({ summary: 'User SignIn' })
    @ApiOkResponse({ description: 'User signed in successfully' })
    @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
    @Public()
    @Post('signin')
    async signin(@Body() data: SignInDto): Promise<{ access_token: string }> {
        const token = await this.authService.SignIn( data.email, data.password );
        return token;
}

    @ApiOperation({ summary: 'User Registration' })
    @ApiOkResponse({ description: 'User registered successfully' })
    @Public()
    @Post('register')
    async register(@Body() data: CreateUserDto): Promise<void> {
        return this.authService.register(data);
    }
}