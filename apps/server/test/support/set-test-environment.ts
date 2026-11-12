import { join } from 'node:path';

// Runs before every test file: no test ever reads the Takam site or the remote database, whatever the shell has set.
process.env.TAKAM_DATA_DIR = join(__dirname, '..', 'fixtures');
process.env.DATABASE_DIR = 'memory://';
delete process.env.DATABASE_URL;
