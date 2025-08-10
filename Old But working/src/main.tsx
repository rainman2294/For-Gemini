import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'

// Function to safely initialize the React app
function initApp() {
  // Always look for our specific container
  const wpRoot = document.getElementById('pulse2-root');
  
  if (wpRoot) {
    // If our container exists, find the root element within it
    const appRoot = wpRoot.querySelector('#root');
    if (appRoot) {
      try {
        const root = createRoot(appRoot);
        root.render(<ErrorBoundary><App /></ErrorBoundary>);
        console.log("Pulse 2 React app initialized successfully");
      } catch (error) {
        console.error("Error initializing Pulse 2 React app:", error);
      }
    } else {
      console.warn("Pulse 2: Could not find #root inside #pulse2-root.");
    }
  } else {
    // If the container is not found, it means the shortcode is not on this page.
    // We can either do nothing, or for standalone development,
    // we can try to find a generic #root.
    const standaloneRoot = document.getElementById('root');
    if (standaloneRoot) {
      try {
        const root = createRoot(standaloneRoot);
        root.render(<ErrorBoundary><App /></ErrorBoundary>);
        console.log("Pulse 2 React app initialized successfully in standalone mode");
      } catch (error) {
        console.error("Error initializing Pulse 2 React app in standalone mode:", error);
      }
    }
  }
}

// Wait for DOM to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM already loaded, initialize immediately
  initApp();
}
