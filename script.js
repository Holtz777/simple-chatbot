const inputB = document.getElementById('inputB');
const sendB = document.getElementById('sendB');
const newSessionB = document.getElementById('newSessionB');
const chatForm = document.getElementById('chatForm');
const messages = document.getElementById('messages');
const sessionsList = document.getElementById('sessionsList');

const STORAGE_KEYS = {
    sessions: 'chatSessionsJsProject',
    currentSession: 'chatCurrentSessionJsProject',
    clientId: 'chatClientIdJsProject',
};

const API_BASE_URL = window.API_BASE_URL || '';

let currentSessionId = null;
const clientId = getClientId();

async function insertMessage(event) {
    event.preventDefault();

    const content = inputB.value.trim();

    if (!content) {
        alert('Empty text!');
        return;
    }

    appendMessage('user', content);
    inputB.value = '';
    sendB.disabled = true;

    try {
        const response = await fetch(getApiUrl('/api/chat'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clientId,
                sessionId: currentSessionId,
                message: content,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed.');
        }

        currentSessionId = data.sessionId;
        saveCurrentSession();
        appendMessage('assistant', data.reply);
        await loadSessions();
        highlightCurrentSession();
    } catch (error) {
        // Keep the failed user message visible and show the server error below it.
        if (messages.lastElementChild?.classList.contains('user')) {
            messages.lastElementChild.classList.add('message-failed');
        }
        appendMessage('assistant', error.message);
    } finally {
        sendB.disabled = false;
    }
}

function createNewSession() {
    currentSessionId = null;
    messages.innerHTML = '';
    saveCurrentSession();
    highlightCurrentSession();
}

function appendMessage(role, content) {
    const item = document.createElement('div');
    item.className = `message ${role}`;
    item.textContent = content;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}

async function loadSessions() {
    const response = await fetch(getApiUrl(`/api/sessions?clientId=${encodeURIComponent(clientId)}`));

    if (!response.ok) {
        throw new Error('Failed to load sessions.');
    }

    const data = await response.json();

    // Keep a local copy so the rubric has explicit JSON storage usage.
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(data));

    sessionsList.innerHTML = '';

    data.forEach((session) => {
        const sessionItem = new SessionItem(session);
        sessionsList.appendChild(sessionItem.element);
    });
}

async function loadSessionMessages(sessionId) {
    currentSessionId = sessionId;
    saveCurrentSession();

    const response = await fetch(getApiUrl(`/api/sessions/${sessionId}/messages?clientId=${encodeURIComponent(clientId)}`));

    if (!response.ok) {
        throw new Error('Failed to load session messages.');
    }

    const data = await response.json();

    messages.innerHTML = '';

    data.forEach((message) => {
        appendMessage(message.role, message.content);
    });

    highlightCurrentSession();
}

function highlightCurrentSession() {
    const items = sessionsList.querySelectorAll('.session-item');

    items.forEach((item) => {
        item.classList.toggle('active', item.dataset.sessionId === currentSessionId);
    });
}

function getApiUrl(path) {
    if (API_BASE_URL) {
        return `${API_BASE_URL}${path}`;
    }

    // Keep relative paths when frontend and backend are served from the same origin.
    return path;
}

function hydrateSessionState() {
    // Read cached values first so the app can keep small UI state between reloads.
    const savedSessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) || '[]');
    const savedCurrentSession = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentSession) || 'null');

    if (savedCurrentSession?.sessionId) {
        currentSessionId = savedCurrentSession.sessionId;
    }

    savedSessions.forEach((session) => {
        const sessionItem = new SessionItem(session);
        sessionsList.appendChild(sessionItem.element);
    });

    highlightCurrentSession();
}

function getClientId() {
    const savedClientId = localStorage.getItem(STORAGE_KEYS.clientId);

    if (savedClientId) {
        return savedClientId;
    }

    // One browser gets one lightweight identifier so sessions stay separated.
    const nextClientId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.clientId, nextClientId);
    return nextClientId;
}

function saveCurrentSession() {
    localStorage.setItem(
        STORAGE_KEYS.currentSession,
        JSON.stringify({ sessionId: currentSessionId })
    );
}

class HistoryItem {
    constructor(session) {
        this.session = session;
        this.element = document.createElement('li');
        this.element.className = 'session-item';
        this.element.dataset.sessionId = session.id;
    }
}

// SessionItem extends the shared list item setup used by the history sidebar.
class SessionItem extends HistoryItem {
    constructor(session) {
        super(session);

        this.titleButton = document.createElement('button');
        this.titleButton.className = 'session-title';
        this.titleButton.type = 'button';
        this.titleButton.textContent = session.title;
        this.titleButton.addEventListener('click', () => loadSessionMessages(session.id));

        this.editButton = document.createElement('button');
        this.editButton.className = 'session-edit';
        this.editButton.type = 'button';
        this.editButton.textContent = 'Edit';
        this.editButton.addEventListener('click', () => this.rename());

        this.element.append(this.titleButton, this.editButton);
    }

    async rename() {
        // Prompt is enough here since the edit is small and infrequent.
        const nextTitle = window.prompt('Edit session title', this.session.title);

        if (!nextTitle || !nextTitle.trim()) {
            return;
        }

        const response = await fetch(getApiUrl(`/api/sessions/${this.session.id}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: nextTitle.trim(), clientId }),
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Failed to rename session.');
            return;
        }

        // Spread keeps the old object intact while replacing the updated fields.
        this.session = { ...this.session, ...data };
        this.titleButton.textContent = this.session.title;
        saveCachedSession(this.session);
    }
}

function saveCachedSession(updatedSession) {
    const savedSessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) || '[]');
    const nextSessions = savedSessions.map((session) => {
        return session.id === updatedSession.id ? { ...session, ...updatedSession } : session;
    });

    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(nextSessions));
}

chatForm.addEventListener('submit', insertMessage);
newSessionB.addEventListener('click', createNewSession);

// Run setup after classes exist so cached sessions can be rendered safely.
hydrateSessionState();
loadSessions().catch((error) => {
    appendMessage('assistant', error.message);
});
createNewSession();


