import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import GeneralRoutes from './generalroutes';
import './styles/index.css';

const root = require('react-dom/client').createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleReCaptchaProvider reCaptchaKey="6LcZQHsrAAAAAMuGo3b_QaIiJw_krUJ76U2eMivQ">
      <Router>
        <GeneralRoutes />
      </Router>
    </GoogleReCaptchaProvider>
  </React.StrictMode>
);
