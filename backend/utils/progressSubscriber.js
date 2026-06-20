import Redis from 'ioredis';
import { progressEmitter } from './progressEmitter.js';

const PROGRESS_CHANNEL = 'progress-events';

/**
 * Set up Redis subscriber to receive progress events from worker processes
 * and forward them to local EventEmitter for SSE clients
 */
export function setupProgressSubscriber() {
  // Create a dedicated Redis client for subscribing
  const subscriber = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
  });

  subscriber.on('connect', () => {
    console.log('📻 Redis subscriber connected for progress events');
  });

  subscriber.on('error', (err) => {
    console.error('❌ Redis subscriber error:', err.message);
  });

  // Subscribe to the progress channel
  subscriber.subscribe(PROGRESS_CHANNEL, (err, count) => {
    if (err) {
      console.error('❌ Failed to subscribe to progress channel:', err.message);
    } else {
      console.log(`✅ Subscribed to ${PROGRESS_CHANNEL} (${count} active subscriptions)`);
    }
  });

  // Handle incoming messages from workers
  subscriber.on('message', (channel, message) => {
    if (channel === PROGRESS_CHANNEL) {
      try {
        const eventData = JSON.parse(message);

        console.log(`📥 Received progress event from Redis:`, {
          sessionId: eventData.sessionId,
          type: eventData.type,
          message: eventData.message?.substring(0, 50)
        });

        // Forward to local EventEmitter for SSE clients
        progressEmitter.emit('progress', eventData);
      } catch (err) {
        console.error('❌ Error parsing progress message from Redis:', err.message);
      }
    }
  });

  return subscriber;
}
