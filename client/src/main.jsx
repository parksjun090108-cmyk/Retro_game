import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

const Router = import.meta.env.VITE_PUBLIC_BUILD === 'true' ? HashRouter : BrowserRouter;
ReactDOM.createRoot(document.getElementById('root')).render(
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
  </Router>
);
