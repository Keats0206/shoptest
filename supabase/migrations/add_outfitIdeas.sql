-- Migration: Add outfitIdeas and outfits columns to drops table
-- Run this migration to update existing database

ALTER TABLE drops 
ADD COLUMN IF NOT EXISTS outfitIdeas JSONB,
ADD COLUMN IF NOT EXISTS outfits JSONB;
