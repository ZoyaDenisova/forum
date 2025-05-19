ALTER TABLE topics
    DROP COLUMN IF EXISTS description;

ALTER TABLE categories
    DROP COLUMN IF EXISTS description;
