import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        if (!response.ok) throw new Error('Health request failed');
        const data = await response.json();
        if (data.status !== 'ok') throw new Error('Unexpected health response');
        setStatus('connected');
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('error');
      }
    }
    checkHealth();
    return () => controller.abort();
  }, []);

  const labels = { loading: 'Loading...', connected: 'Connected', error: 'Error connecting to backend' };
  return <><h1>Home Automation Management System</h1><p>Phase 0</p><p>Dashboard</p><p role="status">Backend connection status: {labels[status]}</p></>;
}