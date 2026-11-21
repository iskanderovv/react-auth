import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { ApiClient } from '@/shared/api/client';
import { AuthProvider } from '@/features/session/AuthProvider';
import { API_URL } from '@/app/config';
import { NoticeProvider } from '@/shared/notice/NoticeProvider';
import './index.css';

const client = new ApiClient(API_URL);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NoticeProvider>
      <AuthProvider client={client}>
        <App />
      </AuthProvider>
    </NoticeProvider>
  </StrictMode>,
);
