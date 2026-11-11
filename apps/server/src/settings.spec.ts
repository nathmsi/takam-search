import { readSettings } from './settings';

describe('readSettings', () => {
  it('has defaults for everything', () => {
    expect(readSettings({})).toEqual({ port: 3100, corsOrigins: ['http://localhost:5173', 'http://localhost:4173'] });
  });

  it('reads the port and the list of origins', () => {
    expect(readSettings({ PORT: '4000', CORS_ORIGINS: 'https://a.example, https://b.example ,' })).toEqual({
      port: 4000,
      corsOrigins: ['https://a.example', 'https://b.example'],
    });
  });

  it.each(['abc', '0', '70000', '3.5'])('stops with a clear message on the port %s', (port: string) => {
    expect(() => readSettings({ PORT: port })).toThrow(/PORT must be a number/);
  });
});
