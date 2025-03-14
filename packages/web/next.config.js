/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['via.placeholder.com', 'placekitten.com', 'placehold.it', 'ui-avatars.com', 'randomuser.me', 'lh3.googleusercontent.com'],
  },
  async rewrites() {
    return [
      // Redirigir las rutas de API específicas al backend NestJS
      // Excluimos específicamente las rutas NextAuth (que empezarían con /api/auth/session, /api/auth/signin, etc)
      // pero incluimos las rutas del backend para auth

      // Rutas específicas para auth del backend (pero no para NextAuth)
      {
        source: '/api/auth/login',
        destination: 'http://localhost:3001/auth/login',
      },
      {
        source: '/api/auth/register',
        destination: 'http://localhost:3001/auth/register',
      },
      {
        source: '/api/auth/google-auth',
        destination: 'http://localhost:3001/auth/google-auth',
      },
      {
        source: '/api/auth/logout',
        destination: 'http://localhost:3001/auth/logout',
      },
      {
        source: '/api/auth/me',
        destination: 'http://localhost:3001/auth/me',
      },
      // Otras rutas de API
      {
        source: '/api/chat/:path*',
        destination: 'http://localhost:3001/chat/:path*',
      },
      {
        source: '/api/users/:path*',
        destination: 'http://localhost:3001/users/:path*',
      },
      {
        source: '/api/rooms/:path*',
        destination: 'http://localhost:3001/rooms/:path*',
      },
    ];
  },
}

module.exports = nextConfig
