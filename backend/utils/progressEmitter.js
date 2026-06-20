import { EventEmitter } from 'events';
import { connection } from '../configs/redis_bullmq.config.js';

// Global progress emitter for streaming logs to frontend
export const progressEmitter = new EventEmitter();

// Increase max listeners to handle multiple SSE connections
progressEmitter.setMaxListeners(20);

// Redis channel for cross-process communication
const PROGRESS_CHANNEL = 'progress-events';

/**
 * Emit progress event to all connected clients
 * Uses Redis pub/sub for cross-process communication (worker -> server)
 * @param {string} sessionId - Unique ID for this automation session
 * @param {object} data - Progress data
 */
export function emitProgress(sessionId, data) {
  const eventData = {
    sessionId,
    timestamp: new Date().toISOString(),
    ...data
  };

  console.log(`🔊 emitProgress called:`, {
    sessionId,
    type: data.type,
    message: data.message?.substring(0, 50),
    localListeners: progressEmitter.listenerCount('progress')
  });

  // Emit locally (for same-process listeners)
  progressEmitter.emit('progress', eventData);

  // Publish to Redis (for cross-process communication)
  connection.publish(PROGRESS_CHANNEL, JSON.stringify(eventData)).catch(err => {
    console.error('❌ Failed to publish progress event to Redis:', err.message);
  });
}

/**
 * Log types for different progress events
 */
export const LogType = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  TASK_START: 'task_start',
  TASK_COMPLETE: 'task_complete',
  TASK_ERROR: 'task_error',
  STEP: 'step'
};
