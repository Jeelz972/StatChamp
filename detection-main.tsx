import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/detection/styles/detection.css';
import { DetectionApp } from './src/detection/DetectionApp';
import { supabase as _supabaseClient } from './src/stores/auth-store';
import { deriveRole } from './src/auth/utils';

// C8 — Detection est réservé aux coachs/root. Sans session, redirige vers index.html.
(async () => {
  try {
    const { data } = await _supabaseClient.auth.getSession();
    const role = deriveRole(data?.session?.user ?? null);
    if (!data?.session || (role !== 'coach' && role !== 'root')) {
      window.location.replace('/index.html');
      return;
    }
  } catch {
    window.location.replace('/index.html');
    return;
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <DetectionApp />
    </React.StrictMode>
  );
})();
