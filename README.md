# Real-time Chat Application

A modern real-time chat application built with NestJS and NextJS in a monorepo structure.

## Features

- Real-time messaging using Socket.io
- Chat rooms for group conversations
- Private messaging between users
- User authentication
- Google authentication
- Modern and responsive UI

## Tech Stack

- **Backend**: NestJS, MongoDB with Mongoose, Socket.io
- **Frontend**: NextJS, React, TailwindCSS, NextAuth.js
- **Monorepo**: Turborepo, NPM Workspaces

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- MongoDB
- npm or yarn

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (see [Environment Variables](#environment-variables) section)

### Running with Docker

The application can be deployed using Docker and Docker Compose:

1. Make sure Docker and Docker Compose are installed on your system
2. Configure environment variables:
   - Update the MongoDB URI in `docker-compose.yml` if needed
   - Set Google OAuth credentials as environment variables or directly in `docker-compose.yml`
3. Build and start the containers:
   ```
   docker-compose up -d --build
   ```
4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

To stop the containers:
```
docker-compose down
```

#### Production Deployment

For production deployment:

1. Update environment variables in the `docker-compose.yml` file:
   - Set appropriate `NEXTAUTH_URL` 
   - Configure secure secrets for `JWT_SECRET` and `NEXTAUTH_SECRET`
   - Set proper `CORS_ORIGIN` values
2. For Google Authentication, ensure your OAuth credentials are configured for your production domain

### Environment Variables

Create the following `.env` files in their respective directories:

#### Backend (packages/api/.env)

```
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/chat-app

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=1d

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

#### Frontend (packages/web/.env.local)

```
# API URL - must match the backend URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Development

To run all applications in development mode:

```
npm run dev
```

To run only the backend:

```
npm run dev --filter=api
```

To run only the frontend:

```
npm run dev --filter=web
```

### Production Build

```
npm run build
npm run start
```

## Project Structure

```
chat/
├── packages/
│   ├── api/          # NestJS backend
│   └── web/          # NextJS frontend
├── turbo.json        # Turborepo configuration
└── package.json      # Root package.json
