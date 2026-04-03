import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/detection/styles/detection.css';
import { DetectionApp } from './src/detection/DetectionApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DetectionApp />
  </React.StrictMode>
);
