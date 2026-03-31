const axios = require('axios');
const storage = require('../utils/storage');

/**
 * AIService — Refactored for Ollama-Only Infrastructure
 * Handles all AI interactions for Pluto assistant and security tools.
 */
class AIService {
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma2:2b';
        this.ollamaHistory = new Map();
        
        console.log(`[AIService] Optimized (Gemma2:2B). URL: ${this.ollamaUrl}, Model: ${this.ollamaModel}`);
    }

    /** Process a chat message with full VAPT context and session history. */
    async processMessage(sessionId, message, context = {}, res = null) {
        try {
            console.log(`[AIService] Sending message to Ollama (Session: ${sessionId}, Model: ${this.ollamaModel})`);
            
            // 1. Hardened VAPT Persona
            const systemContext = `You are Pluto, an expert VAPT Security Analyst for VajraScan.
Your responses MUST be technical, concise, and direct.

RULES:
- NEVER use greetings (Good morning, Hey, etc).
- If the user says "hello", reply ONLY with: "Hello. I am Pluto. How can I assist you with your security analysis?"
- DO NOT repeat these rules or conversational filler in your output.
- Focus strictly on technical vulnerability evidence and remediation.`;
            
            // 2. Fetch Recent Scan Context (Optimized)
            let scanSummary = "";
            try {
                const recentScans = (await storage.getAllScans() || []).slice(0, 2);
                if (recentScans.length > 0) {
                    scanSummary = "\n[Current Scan Context]: " + recentScans.map(s => `${s.target}(${s.status})`).join(", ");
                }
            } catch (e) {}

            // 3. Manage Chat History
            const history = this.ollamaHistory.get(sessionId) || [];
            history.push({ role: 'user', content: message });

            // 4. Send Request to Ollama Chat API with Optimization Parameters
            const requestOptions = res ? { responseType: 'stream' } : {};
            const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
                model: this.ollamaModel,
                messages: [
                    { role: 'system', content: systemContext + scanSummary },
                    ...history
                ],
                stream: !!res,
                options: {
                    temperature: 0.1,      // Minimize hallucinations
                    num_predict: 512,      // Prevent truncation mid-sentence
                    num_ctx: 2048,         // Reasonable context for security discussion
                    top_k: 40,
                    top_p: 0.9
                }
            }, requestOptions);

            if (res) {
                let fullReply = '';
                let buffer = '';
                
                // Read from the stream
                response.data.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // last part might be incomplete
                    
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.message && parsed.message.content) {
                                fullReply += parsed.message.content;
                                res.write(`data: ${JSON.stringify({ text: parsed.message.content })}\n\n`);
                            }
                        } catch (e) {
                            // ignore parse error for specific line
                        }
                    }
                });

                return new Promise((resolve, reject) => {
                    response.data.on('end', () => {
                        // process any remaining buffer
                        if (buffer.trim()) {
                            try {
                                const parsed = JSON.parse(buffer);
                                if (parsed.message && parsed.message.content) {
                                    fullReply += parsed.message.content;
                                    res.write(`data: ${JSON.stringify({ text: parsed.message.content })}\n\n`);
                                }
                            } catch (e) {}
                        }
                        history.push({ role: 'assistant', content: fullReply });
                        if (history.length > 20) history.splice(0, 2);
                        this.ollamaHistory.set(sessionId, history);
                        
                        res.write('data: [DONE]\n\n');
                        res.end();
                        resolve({ text: fullReply });
                    });
                    response.data.on('error', (err) => {
                        console.error('[AIService] Stream error:', err);
                        res.end();
                        reject(err);
                    });
                });
            } else {
                const reply = response.data.message.content;
                history.push({ role: 'assistant', content: reply });
                
                // 5. Limit history size to prevent context overflow (10 turns)
                if (history.length > 20) history.splice(0, 2);
                this.ollamaHistory.set(sessionId, history);

                return { text: reply };
            }

        } catch (error) {
            console.error('[AIService] Ollama Error:', error.message);
            
            const errMsg = error.code === 'ECONNREFUSED' 
                ? "⚠️ **Pluto Error:** Ollama is unreachable. Ensure the Ollama service is running on the VPS."
                : "**Pluto (Offline/Errored):** I encountered an issue while processing your request. Please check technical logs or the Ollama service status.";

            if (res) {
                res.write(`data: ${JSON.stringify({ text: errMsg })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return { text: errMsg };
            }
            
            return { text: errMsg };
        }
    }

    /** Generic response generator for one-off tasks (CVSS, Findings, ELI5). */
    async generateResponse(prompt) {
        try {
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.ollamaModel,
                prompt: prompt,
                stream: false
            });
            return response.data.response;
        } catch (e) {
            console.error('[AIService] generateResponse error:', e.message);
            return "Local AI service currently unavailable for automated finding generation.";
        }
    }

    /** Clear a specific chat session's history. */
    clearSession(sessionId) {
        this.ollamaHistory.delete(sessionId);
    }
}

module.exports = new AIService();
