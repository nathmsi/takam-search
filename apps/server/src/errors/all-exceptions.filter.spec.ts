import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function hostFor(path: string): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ method: 'GET', originalUrl: path }), getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  afterEach(() => jest.restoreAllMocks());

  it('gives an HTTP error the common body', () => {
    const { host, status, json } = hostFor('/v1/documents/H.9.9.9');

    filter.catch(new NotFoundException('No document H.9.9.9'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, error: 'Not Found', message: 'No document H.9.9.9', path: '/v1/documents/H.9.9.9' }));
  });

  it('joins the messages of a validation error', () => {
    const { host, json } = hostFor('/v1/documents');

    filter.catch(new BadRequestException(['limit must not be greater than 1000', 'offset must not be less than 0']), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'limit must not be greater than 1000; offset must not be less than 0' }));
  });

  it('hides a bug from the caller and logs it', () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { host, status, json } = hostFor('/v1/documents');

    filter.catch(new Error('secret detail'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error' }));
    expect(error).toHaveBeenCalled();
  });
});
