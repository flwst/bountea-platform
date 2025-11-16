-- Bountea Platform Database Schema for Supabase
-- Generated from Prisma Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    wallet_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(50) DEFAULT 'unverified',
    kyc_provider VARCHAR(100),
    kyc_completed_at TIMESTAMPTZ,
    user_type VARCHAR(50) NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Bounties table
CREATE TABLE bounties (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(255) UNIQUE NOT NULL,
    asset_id INTEGER NOT NULL,
    asset_precompile_address VARCHAR(255) NOT NULL,
    brand_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    requirements TEXT,
    content_guidelines TEXT,
    deadline TIMESTAMPTZ NOT NULL,
    max_videos INTEGER NOT NULL,
    min_duration_seconds INTEGER,
    max_duration_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    total_deposit DECIMAL(18, 6) NOT NULL,
    remaining_funds DECIMAL(18, 6) NOT NULL,
    total_paid DECIMAL(18, 6) DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Bounty Platforms table
CREATE TABLE bounty_platforms (
    id SERIAL PRIMARY KEY,
    bounty_id INTEGER NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bounty_id, platform)
);

-- Milestones table
CREATE TABLE milestones (
    id SERIAL PRIMARY KEY,
    bounty_id INTEGER NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    views_required BIGINT NOT NULL,
    reward_amount DECIMAL(18, 6) NOT NULL,
    milestone_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bounty_id, milestone_order),
    UNIQUE(bounty_id, views_required)
);

-- Videos table
CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    bounty_id INTEGER NOT NULL REFERENCES bounties(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    platform VARCHAR(50) NOT NULL,
    video_id VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL,
    title TEXT,
    thumbnail_url TEXT,
    description TEXT,
    duration_seconds INTEGER,
    published_at TIMESTAMPTZ,
    current_views BIGINT DEFAULT 0,
    last_checked TIMESTAMPTZ,
    check_count INTEGER DEFAULT 0,
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    total_earned DECIMAL(18, 6) DEFAULT 0,
    milestones_claimed INTEGER DEFAULT 0,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(bounty_id, video_id)
);

-- Video Analyses table
CREATE TABLE video_analyses (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    transcription TEXT,
    transcription_confidence DECIMAL(3, 2),
    language_detected VARCHAR(10),
    content_summary TEXT,
    content_matches BOOLEAN,
    match_confidence DECIMAL(3, 2),
    topics_detected JSONB,
    is_bot BOOLEAN,
    bot_confidence DECIMAL(3, 2),
    bot_signals JSONB,
    rating INTEGER,
    rating_reasoning TEXT,
    overall_confidence DECIMAL(3, 2),
    ai_model_response JSONB,
    ai_model_used VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    processing_time_ms INTEGER,
    api_cost_usd DECIMAL(10, 6),
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, milestone_id)
);

-- Approval Queue table
CREATE TABLE approval_queue (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    analysis_id INTEGER UNIQUE REFERENCES video_analyses(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    decision_type VARCHAR(50),
    decided_by UUID REFERENCES users(id),
    decision_reason TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, milestone_id)
);

-- Admin Actions table
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestone Claims table
CREATE TABLE milestone_claims (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES videos(id),
    bounty_id INTEGER NOT NULL REFERENCES bounties(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    milestone_id INTEGER NOT NULL REFERENCES milestones(id),
    views_at_claim BIGINT NOT NULL,
    reward_amount DECIMAL(18, 6) NOT NULL,
    platform_fee DECIMAL(18, 6) NOT NULL,
    tx_hash VARCHAR(255) NOT NULL,
    block_number BIGINT,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, milestone_id)
);

-- Email Verifications table
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet);
CREATE INDEX idx_users_user_type ON users(user_type);

CREATE INDEX idx_bounties_brand_id ON bounties(brand_id);
CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_bounties_deadline ON bounties(deadline);

CREATE INDEX idx_milestones_bounty_id ON milestones(bounty_id);

CREATE INDEX idx_videos_bounty_id ON videos(bounty_id);
CREATE INDEX idx_videos_creator_id ON videos(creator_id);
CREATE INDEX idx_videos_approval_status ON videos(approval_status);

CREATE INDEX idx_video_analyses_video_id ON video_analyses(video_id);
CREATE INDEX idx_video_analyses_milestone_id ON video_analyses(milestone_id);
CREATE INDEX idx_video_analyses_rating ON video_analyses(rating);

CREATE INDEX idx_approval_queue_status ON approval_queue(status);
CREATE INDEX idx_approval_queue_priority ON approval_queue(priority);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);

CREATE INDEX idx_milestone_claims_bounty_id ON milestone_claims(bounty_id);
CREATE INDEX idx_milestone_claims_creator_id ON milestone_claims(creator_id);

CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bounties_updated_at BEFORE UPDATE ON bounties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_queue_updated_at BEFORE UPDATE ON approval_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Bountea database schema created successfully!';
END $$;