import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const { data } = await axios.post(`${API_URL}/auth/login`, {
            email: credentials.email,
            password: credentials.password
          });

          if (data.user && data.accessToken) {
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              image: data.user.avatar,
              accessToken: data.accessToken
            };
          }
          
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        // Initial sign in
        if (account.provider === 'google') {
          try {
            // Make sure we have valid user data from Google
            if (!user.email) {
              console.error('Missing email from Google profile');
              return token;
            }
            
            // Ensure we send the correct data format
            const googleAuthData = {
              name: user.name || '',
              email: user.email,
              avatar: user.image || ''
            };
            
            console.log('Sending Google auth data to backend:', googleAuthData);
            
            // Register or login with Google
            const { data } = await axios.post(`${API_URL}/auth/google-auth`, googleAuthData);
            
            console.log('Received response from backend:', data);
            
            if (data && data.accessToken) {
              return {
                ...token,
                accessToken: data.accessToken,
                id: data.user.id
              };
            }
            
            return token;
          } catch (error) {
            console.error('Google auth error:', error);
            // Just return token without throwing an error
            return token;
          }
        }
        
        // For credentials login
        if (account.provider === 'credentials') {
          return {
            ...token,
            accessToken: user.accessToken,
            id: user.id
          };
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'  // Redirigir a login en caso de error en lugar de una página de error separada
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET
});
