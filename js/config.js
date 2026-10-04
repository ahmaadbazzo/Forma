/* Runtime configuration. Edit this file to connect optional back-end services.
 * NEVER put secret API keys here — this file is public. Keys belong on your server. */
window.CVM_CONFIG = {
  /* AI: URL of YOUR server endpoint that proxies to an LLM provider.
   * Contract (see README):  POST { action, text, lang, context }  ->  { result: string | string[] }
   * Leave empty to use the built-in offline assistant (rule-based, no network). */
  aiEndpoint: '',
  aiTimeoutMs: 20000,

  /* Future hooks (not used yet): cloud sync, analytics, sharing. */
  syncEndpoint: '',
  analyticsEndpoint: ''
};
