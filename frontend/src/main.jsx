import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import { MetaProvider } from './context/MetaContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <MetaProvider>
            <AuthProvider>
              <CompareProvider>
                <App />
              </CompareProvider>
            </AuthProvider>
          </MetaProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
