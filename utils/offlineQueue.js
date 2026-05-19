import { storage } from '../services/storage';
import axios from 'axios';
import { BASE_URL } from '../services/api';

const QUEUE_KEY = 'offline_request_queue';

class OfflineQueue {
  isFlushing = false;
  healthInterval = null;

  /**
   * Add a request to the offline queue
   */
  async enqueue(endpoint, method, data) {
    try {
      const currentQueueStr = await storage.getItem(QUEUE_KEY);
      const queue = currentQueueStr ? JSON.parse(currentQueueStr) : [];
      
      const newRequest = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        endpoint,
        method,
        data,
        timestamp: new Date().toISOString(),
      };

      queue.push(newRequest);
      await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log(`📦 OfflineQueue: Cached request [${method}] to ${endpoint}. Queue size: ${queue.length}`);
      
      // Setup network listener if not running
      this.startHealthCheckLoop();
      return true;
    } catch (e) {
      console.error('📦 OfflineQueue: Failed to enqueue:', e);
      return false;
    }
  }

  /**
   * Retrieve all items in the queue
   */
  async getQueue() {
    try {
      const queueStr = await storage.getItem(QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear the queue
   */
  async clearQueue() {
    await storage.removeItem(QUEUE_KEY);
  }

  /**
   * Check connection status by pinging the backend health API
   */
  async isOnline() {
    try {
      // 5-second timeout to prevent stalling
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
      return response.status === 200 && response.data?.status === 'OK';
    } catch {
      return false;
    }
  }

  /**
   * Flush the cached requests to the server in FIFO order
   */
  async flush() {
    if (this.isFlushing) return;
    
    const queue = await this.getQueue();
    if (queue.length === 0) {
      this.stopHealthCheckLoop();
      return;
    }

    this.isFlushing = true;
    console.log(`📦 OfflineQueue: Flushing ${queue.length} cached requests...`);

    const token = await storage.getItem('userToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const remainingQueue = [...queue];

    for (const req of queue) {
      try {
        console.log(`📦 OfflineQueue: Processing [${req.method}] to ${req.endpoint}...`);
        await axios({
          url: `${BASE_URL}${req.endpoint}`,
          method: req.method,
          data: req.data,
          headers,
          timeout: 8000,
        });

        // Success: remove from local memory queue
        const index = remainingQueue.findIndex(item => item.id === req.id);
        if (index > -1) remainingQueue.splice(index, 1);
        
        // Save incremental progress in case network drops again
        await storage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
        console.log(`📦 OfflineQueue: Synchronized request ${req.id} successfully!`);
      } catch (err) {
        console.error(`📦 OfflineQueue: Synchronization failed for request ${req.id}:`, err.message);
        
        // If it's a server error (e.g. 400 Bad Request, invalid payload), drop it to avoid blocking queue
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
          console.log(`📦 OfflineQueue: Drop invalid request due to client error (${err.response.status})`);
          const index = remainingQueue.findIndex(item => item.id === req.id);
          if (index > -1) remainingQueue.splice(index, 1);
          await storage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
        } else {
          // It's a connection drop. Break and retry later
          break;
        }
      }
    }

    this.isFlushing = false;
    
    if (remainingQueue.length === 0) {
      console.log('📦 OfflineQueue: All queued requests successfully synchronized!');
      this.stopHealthCheckLoop();
    } else {
      console.log(`📦 OfflineQueue: Sync incomplete. ${remainingQueue.length} requests left in cache.`);
    }
  }

  /**
   * Start a health checker loop to ping the server when offline items exist
   */
  startHealthCheckLoop() {
    if (this.healthInterval) return;

    console.log('📦 OfflineQueue: Starting connection watchdog loop...');
    this.healthInterval = setInterval(async () => {
      const online = await this.isOnline();
      if (online) {
        console.log('📦 OfflineQueue: Watchdog detected restored connection. Triggering sync.');
        this.flush();
      }
    }, 15000); // Check every 15 seconds
  }

  stopHealthCheckLoop() {
    if (this.healthInterval) {
      console.log('📦 OfflineQueue: watch dog stopped.');
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }
}

export const offlineQueue = new OfflineQueue();
export default offlineQueue;
