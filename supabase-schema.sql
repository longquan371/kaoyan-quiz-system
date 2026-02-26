-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' NOT NULL,
    total_score INTEGER DEFAULT 0 NOT NULL,
    coze_api_key TEXT,
    volcengine_api_key TEXT,
    coze_pat_token TEXT,
    selected_document TEXT,
    sequential_mode BOOLEAN DEFAULT FALSE,
    current_paragraph_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- 创建文档表
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建健康检查表
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建问题表
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    source_document TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS questions_type_idx ON questions(type);

-- 创建分数记录表
CREATE TABLE IF NOT EXISTS score_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    is_correct INTEGER NOT NULL,
    score_change INTEGER NOT NULL,
    user_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS score_records_question_id_idx ON score_records(question_id);
CREATE INDEX IF NOT EXISTS score_records_user_id_idx ON score_records(user_id);
