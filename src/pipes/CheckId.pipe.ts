import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException(`Validation failed. "${value}" is not a number.`);
    }

    if (val <= 0) {
      throw new BadRequestException(`Validation failed. "${value}" must be a positive integer.`);
    }

    return val;
  }
}
