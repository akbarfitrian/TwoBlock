-- Replace the agree/disagree reaction pair with a single "love" reaction.
-- Adding the enum value must be committed on its own before it can be
-- referenced by other statements, so the data migration lives in the
-- next migration file (0017).
ALTER TYPE reaction_type ADD VALUE IF NOT EXISTS 'love';
