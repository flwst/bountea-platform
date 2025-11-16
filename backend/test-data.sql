-- ====================================
-- TEST DATA FOR SUB0 PLATFORM
-- Run this in Supabase SQL Editor
-- ====================================

-- ============ STEP 1: CREATE TEST USERS ============

-- Admin User (para ver /admin/queue)
INSERT INTO users (email, wallet, user_type, display_name, email_verified, wallet_verified)
VALUES 
('admin@sub0.io', '0x1111111111111111111111111111111111111111', 'admin', 'Admin User', true, true);

-- Brand User (para crear bounties)
INSERT INTO users (email, wallet, user_type, display_name, email_verified, wallet_verified, bio)
VALUES 
('brand@tech.com', '0x2222222222222222222222222222222222222222', 'brand', 'TechBrand', true, true, 'Leading tech company looking for video creators');

-- Creator Users (para registrar videos)
INSERT INTO users (email, wallet, user_type, display_name, email_verified, wallet_verified, bio)
VALUES 
('creator1@youtube.com', '0x3333333333333333333333333333333333333333', 'creator', 'JohnTech', true, true, 'Tech reviewer with 100K subscribers'),
('creator2@youtube.com', '0x4444444444444444444444444444444444444444', 'creator', 'JaneGaming', true, true, 'Gaming content creator');

-- ============ STEP 2: CREATE TEST BOUNTY ============

-- Get brand_id (will be used in bounty)
DO $$
DECLARE
    brand_user_id UUID;
    new_bounty_id INTEGER;
    milestone1_id INTEGER;
    milestone2_id INTEGER;
    milestone3_id INTEGER;
    first_milestone_id INTEGER;
BEGIN
    -- Get brand user ID
    SELECT id INTO brand_user_id FROM users WHERE wallet = '0x2222222222222222222222222222222222222222';
    
    -- Create bounty
    INSERT INTO bounties (
        contract_address,
        asset_id,
        asset_precompile_address,
        brand_id,
        title,
        description,
        requirements,
        deadline,
        max_videos,
        status,
        total_deposit,
        remaining_funds
    ) VALUES (
        '0xBOUNTY1111111111111111111111111111111111',
        1000,
        '0xASSET11111111111111111111111111111111111',
        brand_user_id,
        'Tech Product Review Contest',
        'Create engaging review videos of our new AI-powered gadget. Show all features and give honest opinions.',
        '- Video must be at least 3 minutes long
- Must show the product in action
- Include unboxing segment
- Mention key features: AI assistant, battery life, design
- Must be original content (no stock footage)',
        NOW() + INTERVAL '30 days',
        10,
        'active',
        1000.00,
        1000.00
    ) RETURNING id INTO new_bounty_id;
    
    -- Add platform
    INSERT INTO bounty_platforms (bounty_id, platform)
    VALUES (new_bounty_id, 'youtube');
    
    -- Create milestones
    INSERT INTO milestones (bounty_id, views_required, reward_amount, milestone_order)
    VALUES
        (new_bounty_id, 10000, 100.00, 1),
        (new_bounty_id, 50000, 400.00, 2),
        (new_bounty_id, 100000, 500.00, 3);
    
    -- Get first milestone ID for later use
    SELECT id INTO first_milestone_id FROM milestones WHERE bounty_id = new_bounty_id ORDER BY milestone_order LIMIT 1;
    
    RAISE NOTICE 'Created bounty with ID: %', new_bounty_id;
END $$;

-- ============ STEP 3: CREATE TEST VIDEOS ============

DO $$
DECLARE
    creator1_id UUID;
    creator2_id UUID;
    test_bounty_id INTEGER;
    video1_id INTEGER;
    video2_id INTEGER;
    video3_id INTEGER;
    first_milestone_id INTEGER;
    analysis_id_var INTEGER;
BEGIN
    -- Get user IDs
    SELECT id INTO creator1_id FROM users WHERE wallet = '0x3333333333333333333333333333333333333333';
    SELECT id INTO creator2_id FROM users WHERE wallet = '0x4444444444444444444444444444444444444444';
    
    -- Get bounty ID
    SELECT id INTO test_bounty_id FROM bounties WHERE title = 'Tech Product Review Contest';
    
    -- Get first milestone
    SELECT id INTO first_milestone_id FROM milestones WHERE bounty_id = test_bounty_id ORDER BY milestone_order LIMIT 1;
    
    -- Video 1: Approved, high views (ready to claim milestone)
    INSERT INTO videos (
        bounty_id,
        creator_id,
        platform,
        video_id,
        video_url,
        title,
        thumbnail_url,
        description,
        duration_seconds,
        published_at,
        current_views,
        approval_status,
        approved_at
    ) VALUES (
        test_bounty_id,
        creator1_id,
        'youtube',
        'dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'Amazing AI Gadget Review - You NEED This!',
        'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        'Full review of the new AI gadget with unboxing and feature showcase',
        380,
        NOW() - INTERVAL '5 days',
        12500,
        'approved',
        NOW() - INTERVAL '4 days'
    ) RETURNING id INTO video1_id;
    
    -- Video 2: Pending approval (needs admin review)
    INSERT INTO videos (
        bounty_id,
        creator_id,
        platform,
        video_id,
        video_url,
        title,
        thumbnail_url,
        description,
        duration_seconds,
        published_at,
        current_views,
        approval_status
    ) VALUES (
        test_bounty_id,
        creator2_id,
        'youtube',
        'jNQXAC9IVRw',
        'https://youtube.com/watch?v=jNQXAC9IVRw',
        'Honest Review: New AI Gadget',
        'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
        'My thoughts on the AI gadget after one week of use',
        240,
        NOW() - INTERVAL '2 days',
        3200,
        'pending'
    ) RETURNING id INTO video2_id;
    
    -- Video 3: Another approved video with lower views
    INSERT INTO videos (
        bounty_id,
        creator_id,
        platform,
        video_id,
        video_url,
        title,
        thumbnail_url,
        description,
        duration_seconds,
        published_at,
        current_views,
        approval_status,
        approved_at
    ) VALUES (
        test_bounty_id,
        creator1_id,
        'youtube',
        'L_jWHffIx5E',
        'https://youtube.com/watch?v=L_jWHffIx5E',
        'AI Gadget: 1 Week Later',
        'https://i.ytimg.com/vi/L_jWHffIx5E/maxresdefault.jpg',
        'Follow-up review after testing for one week',
        195,
        NOW() - INTERVAL '1 day',
        1850,
        'approved',
        NOW() - INTERVAL '1 day'
    ) RETURNING id INTO video3_id;
    
    -- Create AI analysis for video 2 (low rating = needs admin review)
    INSERT INTO video_analyses (
        video_id,
        milestone_id,
        transcription,
        content_summary,
        content_matches,
        match_confidence,
        is_bot,
        bot_confidence,
        bot_signals,
        rating,
        rating_reasoning,
        overall_confidence,
        ai_model_used,
        status
    ) VALUES (
        video2_id,
        first_milestone_id,
        'Hey everyone, today I want to talk about this new AI gadget...',
        'Video discusses the AI gadget with personal opinions.',
        true,
        0.75,
        false,
        0.15,
        '[]'::jsonb,
        6,
        'Content matches requirements but video quality and engagement could be better. Lacks detailed feature showcase.',
        0.78,
        'gpt-4',
        'completed'
    ) RETURNING id INTO analysis_id_var;
    
    -- Add to approval queue
    INSERT INTO approval_queue (
        video_id,
        milestone_id,
        analysis_id,
        status,
        priority
    ) VALUES (
        video2_id,
        first_milestone_id,
        analysis_id_var,
        'pending',
        5
    );
    
    RAISE NOTICE 'Created 3 test videos';
    RAISE NOTICE 'Video 1 (approved, high views): Can claim milestone';
    RAISE NOTICE 'Video 2 (pending): Needs admin approval in /admin/queue';
    RAISE NOTICE 'Video 3 (approved, low views): Still gaining traction';
END $$;

-- ============ SUCCESS MESSAGE ============
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST DATA CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'LOGIN CREDENTIALS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. ADMIN ACCESS:';
    RAISE NOTICE '   Wallet: 0x1111111111111111111111111111111111111111';
    RAISE NOTICE '   → Can access /admin/queue';
    RAISE NOTICE '';
    RAISE NOTICE '2. BRAND ACCESS:';
    RAISE NOTICE '   Wallet: 0x2222222222222222222222222222222222222222';
    RAISE NOTICE '   → Can create bounties and browse creators';
    RAISE NOTICE '';
    RAISE NOTICE '3. CREATOR ACCESS:';
    RAISE NOTICE '   Wallet: 0x3333333333333333333333333333333333333333';
    RAISE NOTICE '   → Has 2 videos (1 ready to claim!)';
    RAISE NOTICE '';
    RAISE NOTICE '   Wallet: 0x4444444444444444444444444444444444444444';
    RAISE NOTICE '   → Has 1 video pending approval';
    RAISE NOTICE '';
    RAISE NOTICE 'TEST BOUNTY CREATED:';
    RAISE NOTICE '   "Tech Product Review Contest"';
    RAISE NOTICE '   - 3 milestones (10K, 50K, 100K views)';
    RAISE NOTICE '   - Total reward: $1000';
    RAISE NOTICE '';
    RAISE NOTICE 'TO TEST THE SYSTEM:';
    RAISE NOTICE '1. Login as Admin (wallet 0x1111...) to approve video';
    RAISE NOTICE '2. Login as Creator (wallet 0x3333...) to see dashboard';
    RAISE NOTICE '3. Login as Brand (wallet 0x2222...) to manage bounty';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: You need to configure Web3Auth to actually login!';
    RAISE NOTICE '========================================';
END $$;

-- Query to verify data
SELECT 
    'Users' as table_name,
    user_type,
    display_name,
    LEFT(wallet, 10) || '...' as wallet_short
FROM users
ORDER BY user_type;

SELECT 
    'Bounties' as table_name,
    title,
    status,
    max_videos,
    video_count
FROM bounties;

SELECT 
    'Videos' as table_name,
    v.title,
    v.approval_status,
    v.current_views,
    u.display_name as creator
FROM videos v
JOIN users u ON v.creator_id = u.id
ORDER BY v.current_views DESC;