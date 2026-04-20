require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.db_host,
    port: Number(process.env.db_port),
    database: process.env.db_name,
    user: process.env.db_user,
    password: process.env.db_password,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function initializeDatabase() {
    // Sessions store the chat title and the last activity timestamp.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions_js_project (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // Messages stay separate so one session can hold the full conversation.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages_js_project (
            id BIGSERIAL PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_chat_session
                FOREIGN KEY (session_id)
                REFERENCES chat_sessions_js_project(id)
                ON DELETE CASCADE
        )
    `);
}

module.exports = { pool, initializeDatabase };
