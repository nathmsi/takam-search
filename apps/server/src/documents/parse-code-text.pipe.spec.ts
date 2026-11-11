import { BadRequestException } from '@nestjs/common';
import { ParseCodeTextPipe } from './parse-code-text.pipe';

describe('ParseCodeTextPipe', () => {
  const pipe = new ParseCodeTextPipe();

  it.each(['H.1.2.1', 'HZ.1.3.3.1', 'T.5.1.1', 'HOD.13.0.3'])('lets %s through', (value: string) => {
    expect(pipe.transform(value)).toBe(value);
  });

  it.each(['abc', '1.2.1', 'H.', 'H.1.a', '../etc/passwd', 'H.1.2.1; DROP TABLE documents', ''])('refuses %p', (value: string) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
