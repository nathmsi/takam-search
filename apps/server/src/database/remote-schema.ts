/**
 * The schema of the remote database (Supabase) that holds the tables of Takam Search. The project is shared with other apps, so
 * everything of ours lives in this one schema: nothing is created in `public`. The search path of every query starts with it.
 */
export const REMOTE_SCHEMA = 'takam_poc';
