-- Broaden the platform layer without implying that Yelp or Instagram links
-- are configured. Each location must still explicitly enable and configure a
-- destination before a public customer can use it.
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'YELP';
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'INSTAGRAM';
