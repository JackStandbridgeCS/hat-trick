-- Supabase schema for the whiteboard app
-- Run this in the Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table: stores the tldraw document state for each room
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS rooms_updated_at_idx ON rooms(updated_at DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read rooms (public boards)
CREATE POLICY "Anyone can read rooms"
  ON rooms
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to insert rooms (create new boards)
CREATE POLICY "Anyone can create rooms"
  ON rooms
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to update rooms (collaborative editing)
CREATE POLICY "Anyone can update rooms"
  ON rooms
  FOR UPDATE
  USING (true);

-- Enable Realtime for the rooms table
-- This allows clients to subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

