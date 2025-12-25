import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class EmailPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // regex cơ bản kiểm tra email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      throw new BadRequestException(`Validation failed. "${value}" is not a valid email.`);
    }

    return value;
  }
}
