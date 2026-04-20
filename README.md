# simple-chatbot

## Project Overview

Simple Chatbot is a JavaScript web application built for the Humber College course `Fundamentals of JavaScript - CPAN-113-0NC`, taught by Professor `Sarvananthan Jeganathan`.

The purpose of this project is to provide a simple chatbot interface where users can start new chat sessions, send messages to an AI model, review previous conversations, and rename sessions from the history panel. The application was designed to demonstrate core JavaScript concepts learned in class, including asynchronous programming, DOM events, classes, JSON handling, API calls, and basic HTML/CSS layout.

## Main Features

- Create a new chat session
- Send a message to the chatbot
- Receive an AI-generated reply using the Groq API
- Save chat messages in PostgreSQL
- Load previous chat sessions from the history panel
- Rename saved sessions
- Keep small UI state in `localStorage`

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js
- Express
- PostgreSQL
- Groq API

## Project Structure

- `index.html`: main page structure
- `styles.css`: application styling
- `script.js`: frontend logic and UI behavior
- `server.js`: backend API routes
- `ai.js`: Groq API integration
- `db.js`: PostgreSQL connection and table setup

## How It Works

1. The user opens the chat interface.
2. The frontend loads previous sessions from the backend.
3. When the user sends a message, the frontend posts the message to `/api/chat`.
4. The backend stores the message, sends the conversation context to Groq, receives a reply, and saves the assistant response.
5. The updated session appears in the history panel.

## Course Concepts Demonstrated

- Asynchronous programming with `async/await`
- Event listeners for form submission and button clicks
- Objects and classes to organize application behavior
- JSON parsing and stringifying for API communication and local storage
- Spread operator for object updates
- API calls between frontend and backend, and backend to Groq
- Basic responsive HTML/CSS interface

## Running the Project Locally

Install dependencies:

```bash
npm install
```

Start the backend server:

```bash
npm start
```

Then open:

```bash
http://localhost:3000
```

## Notes

- This project uses environment variables for the Groq API key and PostgreSQL connection.
- The `.env` file should not be pushed to GitHub.
- The app is designed to run as a single Express service, which makes deployment on Render straightforward.

## Deploying to Render

1. Push the repository to GitHub.
2. Create a new `Web Service` in Render.
3. Connect the `simple-chatbot` repository.
4. Use these settings:

- Build Command: `npm install`
- Start Command: `npm start`

5. Add the environment variables from your local `.env` file in the Render dashboard.
6. Deploy the service.

After deployment, Render will host both the frontend and backend from the same URL.
