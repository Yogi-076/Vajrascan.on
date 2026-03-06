
// Centralized Configuration for VAPT Framework
// This allows switching between Localhost and Production (vajrascan.online) easily.

export const Config = {
    // Uses VITE_API_URL env var if set, otherwise defaults to current host.
    API_URL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`,

    // Chatbot URL: Defaults to current host port for stability. Override for Prod.
    CHATBOT_URL: import.meta.env.VITE_CHATBOT_URL || `http://${window.location.hostname}:18789/__moltbot__/a2ui/`,

    // Feature Flags
    ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK === 'true',

    // Deployment
    DOMAIN: 'vajrascan.online',
};

export default Config;
