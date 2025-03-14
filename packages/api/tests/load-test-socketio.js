const { io } = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001'; // Socket.io uses HTTP for initial handshake
const MAX_CLIENTS = 100; // Increased to 100 concurrent clients
const RAMP_UP_TIME = 15; // Time in seconds to gradually increase connections
const TEST_DURATION = 120; // Increased to 2 minutes
const USERS_FILE_PATH = path.resolve(__dirname, '..', 'test-users.json');
const MESSAGE_INTERVAL = 3000; // Interval between messages (ms)
const MESSAGES_PER_CLIENT = 5; // Number of messages each client will send

// Load test users
let users = [];
try {
  const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
  users = JSON.parse(data);
  console.log(`Loaded ${users.length} test users`);
} catch (error) {
  console.error('Error loading test users:', error);
  process.exit(1);
}

// Metrics
const metrics = {
  startTime: Date.now(),
  connectionsAttempted: 0,
  connectionsSuccessful: 0,
  connectionsFailed: 0,
  messagesReceived: 0,
  messagesSent: 0,
  errors: [],
  connectTimes: [], // Connection times in ms
  messageLatencies: [], // Message latencies in ms
  clientsByStatus: {
    connecting: 0,
    connected: 0,
    disconnected: 0
  }
};

// Function to get an authentication token
async function getAuthToken(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });
    
    if (response.status === 201 && response.data.accessToken) {
      return response.data.accessToken;
    } else {
      console.error(`Error authenticating ${email}: Incorrect response`);
      return null;
    }
  } catch (error) {
    console.error(`Error authenticating ${email}: ${error.message}`);
    return null;
  }
}

// Function to create a Socket.io client
function createSocketClient(user, token, clientIndex) {
  const startTime = Date.now();
  metrics.connectionsAttempted++;
  metrics.clientsByStatus.connecting++;
  
  console.log(`[${clientIndex}] Connecting client for ${user.email}...`);
  
  // Map to track message send times to calculate latencies
  const messageSendTimes = new Map();
  
  const socket = io(WS_URL, {
    transports: ['websocket'],
    auth: {
      token
    },
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
  
  // Connection event
  socket.on('connect', () => {
    const connectTime = Date.now() - startTime;
    metrics.connectTimes.push(connectTime);
    metrics.connectionsSuccessful++;
    metrics.clientsByStatus.connecting--;
    metrics.clientsByStatus.connected++;
    
    console.log(`[${clientIndex}] Client connected: ${user.email} (${connectTime}ms)`);
    
    // Join a random room
    const rooms = ['room1', 'room2', 'room3', 'general'];
    const selectedRoom = rooms[Math.floor(Math.random() * rooms.length)];
    
    socket.emit('join_room', { roomId: selectedRoom });
    
    // Send test messages
    let messageCount = 0;
    const messageInterval = setInterval(() => {
      if (messageCount < MESSAGES_PER_CLIENT && socket.connected) {
        // Include a unique ID for the message to track latency
        const messageId = `${user.email}-${Date.now()}-${messageCount}`;
        const messageData = {
          roomId: selectedRoom,
          content: `Message ${messageCount + 1} from ${user.email} - ${new Date().toISOString()}`,
          messageId: messageId // Add ID for tracking
        };
        
        // Save the send time
        messageSendTimes.set(messageId, Date.now());
        
        socket.emit('send_message', messageData);
        metrics.messagesSent++;
        messageCount++;
        
        // Log only some messages to avoid flooding the console
        if (clientIndex % 10 === 0) {
          console.log(`[${clientIndex}] Message sent by ${user.email}: ${messageData.content.substring(0, 30)}...`);
        }
      } else {
        clearInterval(messageInterval);
      }
    }, MESSAGE_INTERVAL);
  });
  
  // Handle message responses
  socket.on('message', (data) => {
    metrics.messagesReceived++;
    
    // If the message has an ID and we have its send time, calculate latency
    if (data.messageId && messageSendTimes.has(data.messageId)) {
      const sendTime = messageSendTimes.get(data.messageId);
      const latency = Date.now() - sendTime;
      metrics.messageLatencies.push(latency);
      
      // Log only some messages to avoid flooding the console
      if (clientIndex % 10 === 0) {
        console.log(`[${clientIndex}] Message received for ${user.email} (latency: ${latency}ms): ${JSON.stringify(data).substring(0, 50)}...`);
      }
      
      // Remove from map to free memory
      messageSendTimes.delete(data.messageId);
    }
  });
  
  // Handle error events
  socket.on('connect_error', (error) => {
    metrics.connectionsFailed++;
    metrics.clientsByStatus.connecting--;
    metrics.errors.push({
      user: user.email,
      error: error.message,
      time: new Date().toISOString()
    });
    console.error(`[${clientIndex}] Connection error for ${user.email}: ${error.message}`);
  });
  
  // Handle disconnections
  socket.on('disconnect', (reason) => {
    metrics.clientsByStatus.connected--;
    metrics.clientsByStatus.disconnected++;
    console.log(`[${clientIndex}] Client disconnected: ${user.email} - Reason: ${reason}`);
  });
  
  return socket;
}

// Function to calculate statistics
function calculateStats(values) {
  if (values.length === 0) return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  
  return { min, max, avg, p95, p99 };
}

// Main function to run the test
async function runTest() {
  console.log(`Starting load test with ${MAX_CLIENTS} concurrent clients`);
  console.log(`Test duration: ${TEST_DURATION} seconds`);
  console.log(`Each client will send ${MESSAGES_PER_CLIENT} messages`);
  
  const clients = [];
  const clientStartInterval = RAMP_UP_TIME * 1000 / MAX_CLIENTS;
  
  // Start clients gradually
  for (let i = 0; i < MAX_CLIENTS && i < users.length; i++) {
    const user = users[i];
    
    // Wait before starting the next client
    await new Promise(resolve => setTimeout(resolve, clientStartInterval));
    
    // Get authentication token
    const token = await getAuthToken(user.email, 'testpassword123');
    
    if (token) {
      // Create WebSocket client
      const client = createSocketClient(user, token, i);
      clients.push({ socket: client, user, index: i });
    } else {
      console.error(`Failed to obtain token for ${user.email}`);
      metrics.errors.push({
        user: user.email,
        error: 'Failed to obtain authentication token',
        time: new Date().toISOString()
      });
    }
  }
  
  // Print metrics every 10 seconds
  const metricsInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
    const connectStats = calculateStats(metrics.connectTimes);
    const messageLatencyStats = calculateStats(metrics.messageLatencies);
    
    console.log('\n--- Current Metrics (Elapsed Time: %ds) ---', elapsedSeconds);
    console.log(`Clients: connecting=${metrics.clientsByStatus.connecting}, connected=${metrics.clientsByStatus.connected}, disconnected=${metrics.clientsByStatus.disconnected}`);
    console.log(`Connections: attempted=${metrics.connectionsAttempted}, successful=${metrics.connectionsSuccessful}, failed=${metrics.connectionsFailed}`);
    console.log(`Success Rate: ${(metrics.connectionsSuccessful / metrics.connectionsAttempted * 100).toFixed(2)}%`);
    console.log(`Messages: sent=${metrics.messagesSent}, received=${metrics.messagesReceived}`);
    
    console.log('Connection Times (ms): min=%d, max=%d, average=%d, p95=%d, p99=%d',
      connectStats.min, connectStats.max, connectStats.avg.toFixed(2), connectStats.p95, connectStats.p99);
    
    if (metrics.messageLatencies.length > 0) {
      console.log('Message Latencies (ms): min=%d, max=%d, average=%d, p95=%d, p99=%d',
        messageLatencyStats.min, messageLatencyStats.max, messageLatencyStats.avg.toFixed(2), 
        messageLatencyStats.p95, messageLatencyStats.p99);
    }
    
    console.log('------------------------\n');
  }, 10000);
  
  // End the test after the specified duration
  setTimeout(() => {
    clearInterval(metricsInterval);
    
    // Calculate final statistics
    const connectStats = calculateStats(metrics.connectTimes);
    const messageLatencyStats = calculateStats(metrics.messageLatencies);
    const totalDuration = (Date.now() - metrics.startTime) / 1000;
    
    // Print final results
    console.log('\n===== Final Results =====');
    console.log(`Total Duration: ${totalDuration.toFixed(2)} seconds`);
    console.log(`Connections Attempted: ${metrics.connectionsAttempted}`);
    console.log(`Connections Successful: ${metrics.connectionsSuccessful}`);
    console.log(`Connections Failed: ${metrics.connectionsFailed}`);
    console.log(`Connection Success Rate: ${(metrics.connectionsSuccessful / metrics.connectionsAttempted * 100).toFixed(2)}%`);
    console.log(`Messages Sent: ${metrics.messagesSent}`);
    console.log(`Messages Received: ${metrics.messagesReceived}`);
    console.log(`Message Delivery Rate: ${(metrics.messagesReceived / metrics.messagesSent * 100).toFixed(2)}%`);
    
    console.log('\nConnection Times (ms):');
    console.log(`  Minimum: ${connectStats.min}`);
    console.log(`  Maximum: ${connectStats.max}`);
    console.log(`  Average: ${connectStats.avg.toFixed(2)}`);
    console.log(`  p95: ${connectStats.p95}`);
    console.log(`  p99: ${connectStats.p99}`);
    
    if (metrics.messageLatencies.length > 0) {
      console.log('\nMessage Latencies (ms):');
      console.log(`  Minimum: ${messageLatencyStats.min}`);
      console.log(`  Maximum: ${messageLatencyStats.max}`);
      console.log(`  Average: ${messageLatencyStats.avg.toFixed(2)}`);
      console.log(`  p95: ${messageLatencyStats.p95}`);
      console.log(`  p99: ${messageLatencyStats.p99}`);
    }
    
    // Calculate performance
    const messagesPerSecond = metrics.messagesSent / totalDuration;
    const connectionsPerSecond = metrics.connectionsSuccessful / totalDuration;
    
    console.log('\nPerformance:');
    console.log(`  Connections per Second: ${connectionsPerSecond.toFixed(2)}`);
    console.log(`  Messages per Second: ${messagesPerSecond.toFixed(2)}`);
    
    if (metrics.errors.length > 0) {
      console.log('\nErrors (showing the last 5):');
      metrics.errors.slice(-5).forEach(err => {
        console.log(`  - ${err.user}: ${err.error} (${err.time})`);
      });
      console.log(`  Total Errors: ${metrics.errors.length}`);
    } else {
      console.log('\nNo errors occurred during the test.');
    }
    
    console.log('\n=============================');
    
    // Close all connections
    console.log('Closing client connections...');
    clients.forEach(client => {
      if (client.socket && client.socket.connected) {
        client.socket.disconnect();
      }
    });
    
    console.log('Test completed');
    process.exit(0);
  }, TEST_DURATION * 1000);
}

// Run the test
runTest();
