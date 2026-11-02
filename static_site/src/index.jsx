import {StrictMode} from 'react';
import ReactDOM from 'react-dom/client';
import {AuthProvider} from 'react-oidc-context';
import './index.css';
import App from './App';
import {buildOidcConfig} from './config/auth';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <StrictMode>
        <AuthProvider {...buildOidcConfig()}>
            <App/>
        </AuthProvider>
    </StrictMode>
);
