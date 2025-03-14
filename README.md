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

```

## Performance Testing

The application includes tools to measure performance and determine how many concurrent users it can handle without degrading performance.

### Prerequisites

1. Install k6 for load testing:
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. Install dependencies for test scripts:
   ```bash
   cd packages/api
   npm install @faker-js/faker axios --save-dev
   ```

### Running Performance Tests

1. **Generate Test Users**
   
   First, create test users and rooms for the load tests:
   ```bash
   cd packages/api
   node tests/user-generator.js
   ```
   This creates 100 test users and 10 chat rooms in your database.

2. **Run REST API Load Test**
   
   Test the REST API endpoints performance:
   ```bash
   cd packages/api
   k6 run tests/load-test-rest.js
   ```
   This test gradually scales from 0 to 200 concurrent users accessing API endpoints.

3. **Run WebSocket Load Test**
   
   Test real-time messaging performance:
   ```bash
   cd packages/api
   node tests/load-test-socketio.js
   ```
   This test evaluates how the system performs with 100 concurrent Socket.io connections, each sending multiple messages.

### Analyzing Results

Key metrics to monitor:
- **Connection Time**: How quickly clients can establish Socket.io connections
- **Message Latency**: Time taken for messages to be processed
- **Connection Success Rate**: Percentage of successful connections
- **Message Delivery Rate**: Percentage of messages successfully delivered
- **Server Resources**: Watch CPU and memory usage during peak loads

Detailed information about the performance tests can be found in `packages/api/tests/README.md`.

## Running Tests

### Unit Tests

```bash
# Backend tests
cd packages/api
npm run test

# Frontend tests
cd packages/web
npm run test
```

## Project Structure

```
chat/
├── packages/
│   ├── api/          # NestJS backend
│   └── web/          # NextJS frontend
├── turbo.json        # Turborepo configuration
└── package.json      # Root package.json
