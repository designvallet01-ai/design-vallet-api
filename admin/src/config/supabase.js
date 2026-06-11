import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mockproject.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock_anon_key';

const isMock = supabaseUrl.includes('mockproject');

let clientInstance = null;

if (isMock) {
  console.log('⚠️ Admin Supabase client initialized in mock mode. Realtime subscriptions simulated.');
  
  // Custom mock listener channels builder
  clientInstance = {
    channel(name) {
      return {
        on(event, filter, callback) {
          console.log(`[MOCK REALTIME] Subscribed to channel ${name} for event ${event}`);
          // Store callbacks globally for testing simulations
          if (!window.mockRealtimeListeners) {
            window.mockRealtimeListeners = {};
          }
          if (!window.mockRealtimeListeners[name]) {
            window.mockRealtimeListeners[name] = [];
          }
          window.mockRealtimeListeners[name].push(callback);
          return this;
        },
        subscribe() {
          console.log(`[MOCK REALTIME] Channel ${name} subscribed successfully.`);
          return {
            unsubscribe() {
              console.log(`[MOCK REALTIME] Channel ${name} unsubscribed.`);
            }
          };
        }
      };
    }
  };
  
  // Expose a helper to trigger real-time updates inside browser console for verification!
  window.simulateRealtimeDbChange = (channelName, payload) => {
    if (window.mockRealtimeListeners && window.mockRealtimeListeners[channelName]) {
      console.log(`[SIMULATING DB CHANGE] Channel: ${channelName} | Payload:`, payload);
      window.mockRealtimeListeners[channelName].forEach(cb => cb(payload));
    } else {
      console.warn(`No listeners found for channel: ${channelName}`);
    }
  };
} else {
  clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Admin Supabase Client Initialized.');
}

const supabase = clientInstance;
export default supabase;
export { isMock };
