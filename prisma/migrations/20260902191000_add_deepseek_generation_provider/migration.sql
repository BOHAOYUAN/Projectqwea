-- Keep analytics truthful about which server-side generator produced a draft.
-- Existing LOCAL and GROQ rows remain unchanged.
ALTER TYPE "GenerationProvider" ADD VALUE IF NOT EXISTS 'DEEPSEEK';
