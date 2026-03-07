
// Centralized Configuration for VAPT Framework
// This allows switching between Localhost and Production (vajrascan.online) easily.

export const Config = {
    // Uses relative path for API to work with reverse proxies and HTTPS.
    API_URL: import.meta.env.VITE_API_URL || '',

    // Chatbot URL: Use relative path if possible, or adapt to the current host.
    CHATBOT_URL: import.meta.env.VITE_CHATBOT_URL || `/__moltbot__/a2ui/`,

    // Feature Flags
    ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK === 'true',

    // Deployment
    DOMAIN: 'vajrascan.online',
};

export default Config;
