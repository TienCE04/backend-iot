import { Controller } from '@nestjs/common';
import { RoleService } from './role.service';
import { Public } from 'src/decorator/decorator';

@Public()
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}
}
