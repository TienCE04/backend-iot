import { Controller, Body, Delete, Get, Param, Post, Put, NotFoundException, UseGuards, Req } from '@nestjs/common';
import { PlantService } from './plant.service';
import { CreatePlantDto } from './dto/createPlant.dto';
import { UpdatePlantDto } from './dto/updatePlant.dto';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiForbiddenResponse, 
    ApiConflictResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { PlantDto } from './dto/plant.dto';
import { PositiveIntPipe } from 'src/pipes/CheckId.pipe'; 
import { Roles } from 'src/decorator/decorator';
import { Role } from 'src/role/role.enum';
import { RolesAuthGuard } from 'src/auth/guard/role.guard';
import { AuthGuard } from 'src/auth/guard/guard';

@ApiTags('Plant') 
@Controller('plants') 
export class PlantController {
    constructor(private readonly plantService: PlantService) {}
    
    @ApiOperation({ summary: 'Create a new Plant in the library (Admin only)' })
    @ApiCreatedResponse({ description: 'Plant successfully created', type: PlantDto })
    @ApiForbiddenResponse({ description: 'Forbidden access (Requires Admin role)' })
    @ApiConflictResponse({ description: 'Plant name already exists' })
    @ApiBearerAuth()
    @Post()
    @UseGuards(AuthGuard, RolesAuthGuard)
    @Roles(Role.ADMIN) // admin mới tạo được plant
    async createPlant(
        @Body() createPlantDto: CreatePlantDto,
        @Req() req,
    ): Promise<any> {
        const adminId = req.user.id || req.user.userId;
        return this.plantService.create(createPlantDto, adminId); 
    }

    @ApiOperation({ summary: 'List all Plants in the library' })
    @ApiOkResponse({
        description: 'List of Plants retrieved successfully',
        type: [PlantDto],
    })
    @Get()
    async findAllPlants(): Promise<PlantDto[]> {
        return this.plantService.findAll() as any as PlantDto[];
    }

    @ApiOperation({ summary: 'Find Plant by ID' })
    @ApiOkResponse({ description: 'Plant found by ID', type: PlantDto })
    @ApiNotFoundResponse({ description: 'Plant not found' })
    @Get('/:id')
    async findPlantById(
        @Param('id', PositiveIntPipe) id: number,
    ): Promise<PlantDto> {
        return this.plantService.findOne(id) as any as PlantDto;
    }

    
    @ApiOperation({ summary: 'Update Plant by ID (Admin only)' })
    @ApiOkResponse({ description: 'Plant successfully updated', type: PlantDto })
    @ApiNotFoundResponse({ description: 'Plant not found' })
    @ApiForbiddenResponse({ description: 'Forbidden access (Requires Admin role)' })
    @ApiBearerAuth()
    @Put('/:id')
    @UseGuards(AuthGuard, RolesAuthGuard)
    @Roles(Role.ADMIN)
    async updatePlantById(
        @Param('id', PositiveIntPipe) id: number,
        @Body() updatePlantDto: UpdatePlantDto,
    ): Promise<PlantDto> {
        return this.plantService.update(id, updatePlantDto) as any as PlantDto;
    }

    @ApiOperation({ summary: 'Delete Plant by ID (Admin only)' })
    @ApiOkResponse({ description: 'Plant successfully deleted', type: Object })
    @ApiNotFoundResponse({ description: 'Plant not found' })
    @ApiForbiddenResponse({ description: 'Forbidden access (Requires Admin role)' })
    @ApiBearerAuth()
    @Delete('/:id')
    @UseGuards(AuthGuard, RolesAuthGuard)
    @Roles(Role.ADMIN)  
    async deletePlantById(@Param('id', PositiveIntPipe) id: number): Promise<{ message: string }> {
        const deleted = await this.plantService.deleteUserById(id);
        if (!deleted) {
            throw new NotFoundException('Plant not found');
        }
        return { message: 'Delete successfully' };
    }
}