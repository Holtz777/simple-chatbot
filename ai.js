require('dotenv').config();

const { Groq } = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.groq_api_key,
});

// Keep the model response small enough to fit the current Groq limits.
async function sendMessage(messages) {
    const response = await groq.chat.completions.create({
        messages,
        model: 'openai/gpt-oss-120b',
        temperature: 0.7,
        max_completion_tokens: 512,
        top_p: 1,
        stream: false,
        reasoning_effort: 'medium',
    });

    return response.choices[0]?.message?.content || '';
}

module.exports = { sendMessage };
