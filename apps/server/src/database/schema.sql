-- The whole database of the project: three tables and a few small functions. Written for PostgreSQL.
-- It runs when the server starts and is safe to run again (IF NOT EXISTS / OR REPLACE).

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Making Hebrew comparable.
--    The same function cleans the stored text and the words someone types, so both sides always agree:
--      - vowel points disappear;
--      - quotes inside a word disappear (דו"ח and דוח, תכ"ם and תכ''ם become the same word);
--      - anything that is not a letter, a digit or the dot of a number (1.4.3) becomes a space;
--      - a word loses its plural / feminine ending (ים ות ית ה ת י ...) and a one-letter prefix (ה ב ל כ ש),
--        so קופת and קופות, התחייבות and התחייבויות, מקדמה and מקדמות meet.
--    It is a simple rule, not a dictionary: it is right most of the time and sometimes wrong in the same way on both sides.
-- ---------------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_he(input text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  WITH
    -- 1. vowel points
    s1 AS (SELECT regexp_replace(lower(coalesce(input, '')), '[֑-ׇ]', '', 'g') AS t),
    -- 2. quotes inside a word
    s2 AS (SELECT regexp_replace(t, '([א-ת])[''"״׳]+(?=[א-ת])', '\1', 'g') AS t FROM s1),
    -- 3. everything that is not a letter, a digit or a dot becomes a space
    s3 AS (SELECT regexp_replace(t, '[^א-תa-z0-9.]+', ' ', 'g') AS t FROM s2),
    -- 4. a dot that is not inside a number becomes a space; a space on each side so the first and the last word are like the others
    s4 AS (SELECT ' ' || regexp_replace(t, '(?<![0-9])\.|\.(?![0-9])', ' ', 'g') || ' ' AS t FROM s3),
    -- 5. a one-letter prefix (ה ב ל כ ש), twice for two (כש+ה...), only if at least four letters remain.
    --    A bare ו is left alone (it is often a letter of the word, as in ועדה); it is removed only before another prefix (ובתקציב).
    s5 AS (SELECT regexp_replace(
                    regexp_replace(
                      regexp_replace(t, '(?<= )ו(?=[הבלכש][א-ת]{4,})', '', 'g'),
                      '(?<= )[הבלכש](?=[א-ת]{4,})', '', 'g'),
                    '(?<= )[הבלכש](?=[א-ת]{4,})', '', 'g') AS t FROM s4),
    -- 6. a plural ending
    s6 AS (SELECT regexp_replace(t, '(?<=[א-ת]{3})(ויות|יות|ים|ות|ית)(?= )', '', 'g') AS t FROM s5),
    -- 7. a feminine or possessive ending
    s7 AS (SELECT regexp_replace(t, '(?<=[א-ת]{3})[התי](?= )', '', 'g') AS t FROM s6)
  SELECT btrim(regexp_replace(t, '\s+', ' ', 'g')) FROM s7;
$$;

-- The words of a search, ready to compare: cleaned, without the little words that carry no meaning (של, את, מה, האם ...).
CREATE OR REPLACE FUNCTION search_terms(query text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_agg(DISTINCT word), ARRAY[]::text[])
  FROM unnest(string_to_array(normalize_he(query), ' ')) AS word
  WHERE length(word) >= 2
    AND word NOT IN ('של', 'את', 'על', 'עם', 'אם', 'או', 'כי', 'לא', 'מה', 'מי', 'האם', 'יש', 'שיש', 'כשיש', 'אין', 'שאין', 'כשאין',
                     'כל', 'זה', 'זו', 'גם', 'אל', 'הוא', 'היא', 'הם', 'אשר', 'כאשר', 'לפי', 'בין', 'עוד', 'רק', 'אך', 'אבל', 'כך',
                     'כמו', 'לכן');
$$;

-- Does a cleaned text contain a typed word? The word must START a word of the text (so ועד finds ועדת but not מועד),
-- with or without a ו in front (a ו that means "and").
CREATE OR REPLACE FUNCTION has_term(haystack text, term text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT (' ' || coalesce(haystack, '')) LIKE ('% ' || term || '%')
      OR (' ' || coalesce(haystack, '')) LIKE ('% ו' || term || '%');
$$;

-- A number like 1.10.2 as numbers {1,10,2}, so that 1.2 sorts before 1.10 (as text it would not). NULL when it is not a number.
CREATE OR REPLACE FUNCTION natural_key(code text) RETURNS int[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN code ~ '^[0-9]+(\.[0-9]+)*$' THEN string_to_array(code, '.')::int[] END;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. The tables (the objects of the Takam site, one row each).
-- ---------------------------------------------------------------------------------------------------------------------

-- pgvector: the `vector` type, to compare texts by meaning (see `documents.embedding`).
CREATE EXTENSION IF NOT EXISTS vector;

-- A chapter ('1') or a sub-chapter ('1.2'). A sub-chapter points to its chapter.
CREATE TABLE IF NOT EXISTS chapters (
  code        text PRIMARY KEY,
  title       text NOT NULL,
  parent_code text REFERENCES chapters (code)       -- NULL for a chapter
);

-- A document of the site: an instruction, a temporary instruction, a form, a message, a tender notice...
CREATE TABLE IF NOT EXISTS documents (
  id           integer PRIMARY KEY,                 -- the id of the document on the Takam site
  code_text    text NOT NULL UNIQUE,                -- 'H.1.2.1': also the address of its page on the site
  code         text,                                -- '1.2.1'
  title        text NOT NULL,
  type         text NOT NULL,                       -- Instruction, Temporary Instruction, Form, Message, Tender Notice, ...
  description  text,
  keywords     text,                                -- as the site writes them: 'a, b, c'
  version      integer NOT NULL,
  valid_from   date,
  valid_to     date,                                -- NULL while it has no end date
  chapter_code text REFERENCES chapters (code),     -- its sub-chapter; NULL when the site does not say
  parent_id    integer REFERENCES documents (id) DEFERRABLE INITIALLY DEFERRED,   -- a form or a message belongs to an instruction

  -- The meaning of the document, as 768 numbers (pgvector). Made by `pnpm data:embed` from the title, the description and the
  -- keywords, loaded from data/embeddings.json. NULL for the documents of the sections that were not embedded (the experiment).
  embedding     vector(768),

  -- The same texts, cleaned by normalize_he(): the columns the search reads. The database keeps them up to date.
  title_n       text GENERATED ALWAYS AS (normalize_he(title)) STORED,
  keywords_n    text GENERATED ALWAYS AS (normalize_he(keywords)) STORED,
  description_n text GENERATED ALWAYS AS (normalize_he(description)) STORED,
  code_n        text GENERATED ALWAYS AS (normalize_he(code_text)) STORED
);

CREATE INDEX IF NOT EXISTS documents_chapter_idx ON documents (chapter_code);
CREATE INDEX IF NOT EXISTS documents_type_idx ON documents (type);
