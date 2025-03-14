# Performance Testing for the Chat Application

This directory contains tools for performance testing the chat application, allowing you to evaluate how many concurrent users it can handle without degrading performance.

## Tools Used

- **K6**: A modern load testing tool developed by Grafana Labs
- **Faker**: To generate realistic user data for testing

## Test Files

- `load-test-rest.js`: Tests for REST APIs
- `load-test-socketio.js`: Tests for Socket.io real-time connections
- `user-generator.js`: Script to generate test users

## Requirements

1. Install k6:
   ```
   # macOS
   brew install k6
   
   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. Install dependencies for the user generator:
   ```
   npm install @faker-js/faker axios --save-dev
   ```

## Steps to Run the Tests

### 1. Generate Test Users

First, we need to create users for testing:

```bash
node tests/user-generator.js
```

This command will create 100 users and 10 chat rooms in the database. The details will be saved in `test-users.json`.

### 2. Run REST Load Tests

```bash
k6 run tests/load-test-rest.js
```

This test will gradually scale from 0 to 200 concurrent users, making HTTP requests to the REST APIs.

### 3. Run Socket.io Load Tests

```bash
node tests/load-test-socketio.js
```

This test will connect 100 concurrent Socket.io clients, each sending multiple messages to test the real-time capabilities of the system.

## Interpreting Results

### Key Metrics to Observe:

1. **Response Time (http_req_duration)**:
   - p95 < 500ms: 95% of requests should complete in less than 500ms
   - If response times increase significantly, it may indicate performance issues

2. **Error Rate (http_req_failed)**:
   - Should remain below 1%
   - An increase in errors may indicate that the system is overloaded

3. **Socket.io Connections**:
   - Connection time: Time to establish Socket.io connections
   - Message latency: Time for messages to be processed and delivered
   - Connection success rate: Percentage of successful connections
   - Message delivery rate: Percentage of messages successfully delivered

4. **Server Resource Usage**:
   - Monitor CPU, memory, and network usage during tests
   - Identify bottlenecks in specific resources

## Recommendations for Performance Improvements

If tests show performance degradation:

1. **Implement Caching**:
   - Consider Redis for caching frequently accessed data
   - Implement in-memory caching for repetitive operations

2. **Optimize Database Queries**:
   - Add indexes to frequently queried fields
   - Optimize complex or heavy queries

3. **Horizontal Scaling**:
   - Consider implementing multiple API instances behind a load balancer
   - Configure Socket.io to work with multiple nodes using adapters like Redis

4. **Optimize Socket.io Load**:
   - Limit message frequency
   - Implement throttling mechanisms for aggressive clients

5. **Monitoring**:
   - Implement monitoring solutions like Prometheus/Grafana for continuous tracking

## Monitoring During Tests

To view real-time metrics during test execution:

```bash
# In another terminal, while tests are running
docker stats
```

Or use tools like htop:

```bash
htop
