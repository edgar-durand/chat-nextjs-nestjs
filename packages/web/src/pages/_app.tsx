import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../contexts/AuthContext';
import { ChatProvider } from '../contexts/ChatContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider 
      session={pageProps.session}
      refetchInterval={0} // Disable automatic refetching
    >
      <AuthProvider>
        <ChatProvider>
          <Component {...pageProps} />
        </ChatProvider>
      </AuthProvider>
    </SessionProvider>
  );
}

export default MyApp;
