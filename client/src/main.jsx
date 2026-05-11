import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global button double-click prevention
document.addEventListener('click', (e) => {
  const button = e.target.closest('button, input[type="button"], input[type="submit"]');
  if (button) {
    if (button.dataset.isProcessing === 'true') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    button.dataset.isProcessing = 'true';
    setTimeout(() => {
      delete button.dataset.isProcessing;
    }, 300);
  }
}, true);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
