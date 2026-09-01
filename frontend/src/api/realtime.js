export function createRealtimeConnection({ onMessage, onRead, onTyping, onStatus, onSocket }) {
  const token = localStorage.getItem('emberly_token');
  if (!token || typeof WebSocket === 'undefined') return () => {};

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let closed = false;
  let reconnectTimer = null;
  let pingTimer = null;
  let reconnectAttempt = 0;
  let currentSocket = null;

  const connect = () => {
    if (closed) return;
    onStatus?.('connecting');
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    currentSocket = ws;
    onSocket?.(ws);
    ws.onopen = () => {
      reconnectAttempt = 0;
      onStatus?.('authenticating');
      ws.send(JSON.stringify({ type: 'auth', token }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ready') {
          onStatus?.('connected');
          pingTimer = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
          }, 20_000);
        } else if (data.type === 'message.created') onMessage?.(data);
        else if (data.type === 'message.read') onRead?.(data);
        else if (data.type === 'typing') onTyping?.(data);
        else if (data.type === 'error' && data.code === 'AUTH_FAILED') {
          closed = true;
          onStatus?.('error');
          window.dispatchEvent(new CustomEvent('emberly:session-expired'));
        }
      } catch { /* ignore malformed frames */ }
    };
    ws.onerror = () => onStatus?.('error');
    ws.onclose = () => {
      if (pingTimer) window.clearInterval(pingTimer);
      pingTimer = null;
      if (closed) return;
      onStatus?.('reconnecting');
      const delay = Math.min(10_000, 800 * (2 ** reconnectAttempt));
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    };
  };

  connect();

  return () => {
    closed = true;
    try { currentSocket?.close(); } catch {}
    currentSocket = null;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    if (pingTimer) window.clearInterval(pingTimer);
    onStatus?.('offline');
  };
}
