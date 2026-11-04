import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import './styles.css';
import { ApiError } from './api';
import App from './App';

// A 401 means the session ended, so go back to the login screen.
const onError = (error: Error) => {
  if (error instanceof ApiError && error.status === 401) queryClient.setQueryData(['me'], { user: null });
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: { retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
