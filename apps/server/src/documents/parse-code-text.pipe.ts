import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';

const CODE_TEXT: RegExp = /^[A-Za-z]{1,3}\.\d{1,3}(\.\d{1,3})*$/;

/** Lets a number like `H.1.2.1` through; anything else is a 400, not a search for nothing. */
@Injectable()
export class ParseCodeTextPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!CODE_TEXT.test(value)) throw new BadRequestException('A document number looks like H.1.2.1');
    return value;
  }
}
