import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { chargerCabinet } from './utils/cabinet';

const root = ReactDOM.createRoot(document.getElementById('root'));
chargerCabinet().then(() => root.render(<React.StrictMode><App /></React.StrictMode>));
