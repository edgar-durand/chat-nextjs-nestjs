import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ChatProvider>
        <Component {...pageProps} />
      </ChatProvider>
    </AuthProvider>
  );
}
