require('dotenv').config();

const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const path = require('path');

const { sendMessage } = require('./ai');
const { pool, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow the Netlify frontend to call this API from a different origin.
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// The sidebar only needs session metadata, not the full message list.
app.get('/api/sessions', async (_req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, created_at, updated_at
            FROM chat_sessions_js_project
            ORDER BY updated_at DESC, created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load sessions.' });
    }
});

app.get('/api/sessions/:sessionId/messages', async (req, res) => {
    try {
        const result = await pool.query(
            `
                SELECT role, content, created_at
                FROM chat_messages_js_project
                WHERE session_id = $1
                ORDER BY created_at ASC, id ASC
            `,
            [req.params.sessionId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load messages.' });
    }
});

app.post('/api/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const currentSessionId = sessionId || crypto.randomUUID();
    const trimmedMessage = message.trim();

    try {
        // A fresh chat gets its session row before the first message is saved.
        const existingSession = await pool.query(
            'SELECT id, title FROM chat_sessions_js_project WHERE id = $1',
            [currentSessionId]
        );

        if (existingSession.rowCount === 0) {
            await pool.query(
                'INSERT INTO chat_sessions_js_project (id, title) VALUES ($1, $2)',
                [currentSessionId, 'New session']
            );
        }

        await pool.query(
            'INSERT INTO chat_messages_js_project (session_id, role, content) VALUES ($1, $2, $3)',
            [currentSessionId, 'user', trimmedMessage]
        );

        if (existingSession.rowCount === 0) {
            await pool.query(
                `
                    UPDATE chat_sessions_js_project
                    SET title = $2, updated_at = NOW()
                    WHERE id = $1
                `,
                [currentSessionId, buildSessionTitle(trimmedMessage)]
            );
        } else {
            await pool.query(
                `
                    UPDATE chat_sessions_js_project
                    SET updated_at = NOW()
                    WHERE id = $1
                `,
                [currentSessionId]
            );
        }

        const historyResult = await pool.query(
            `
                SELECT role, content
                FROM chat_messages_js_project
                WHERE session_id = $1
                ORDER BY created_at ASC, id ASC
            `,
            [currentSessionId]
        );

        // Send the current conversation so the reply keeps the same context.
        const reply = await sendMessage(historyResult.rows);

        await pool.query(
            'INSERT INTO chat_messages_js_project (session_id, role, content) VALUES ($1, $2, $3)',
            [currentSessionId, 'assistant', reply]
        );

        await pool.query(
            `
                UPDATE chat_sessions_js_project
                SET updated_at = NOW()
                WHERE id = $1
            `,
            [currentSessionId]
        );

        res.json({ sessionId: currentSessionId, reply });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error?.error?.error?.message || error.message || 'Failed to send message.',
        });
    }
});

app.patch('/api/sessions/:sessionId', async (req, res) => {
    const { title } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        const result = await pool.query(
            `
                UPDATE chat_sessions_js_project
                SET title = $2, updated_at = NOW()
                WHERE id = $1
                RETURNING id, title, created_at, updated_at
            `,
            [req.params.sessionId, title.trim()]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update session.' });
    }
});

function buildSessionTitle(message) {
    // First user message becomes a readable label in the history list.
    return message.length > 30 ? `${message.slice(0, 30)}...` : message;
}

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database initialization failed:', error);
        process.exit(1);
    });
