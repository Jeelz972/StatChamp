// react-shim.js -- Expose React/ReactDOM comme globaux pour les fichiers non-migres
import React from 'react';
import ReactDOM from 'react-dom/client';
window.React = React;
window.ReactDOM = ReactDOM;
