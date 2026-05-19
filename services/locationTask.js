import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { storage } from './storage';
import axios from 'axios';
import { BASE_URL } from './api';
import socketService from './socket';

export const BACKGROUND_TRACKING_TASK = 'BACKGROUND_TRACKING';
const MIN_DISTANCE_METERS = 10;

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

TaskManager.defineTask(BACKGROUND_TRACKING_TASK, async ({ data: { locations }, error }) => {
  if (error) {
    console.error('📍 BackgroundTask Error:', error);
    return;
  }
  
  if (locations && locations.length > 0) {
    const location = locations[0];
    const { latitude, longitude, speed, accuracy, heading } = location.coords;
    const timestamp = location.timestamp;
    
    // Ignore highly inaccurate readings
    if (accuracy > 50) {
      // console.log(`📍 BackgroundTask: Ignored coordinate due to poor accuracy (${accuracy}m)`);
      return;
    }
    
    try {
      const sessionId = await storage.getItem('currentTrackingSessionId');
      if (!sessionId) {
        return;
      }
      
      // Check distance from last recorded location
      const lastLocationStr = await storage.getItem('last_recorded_location');
      if (lastLocationStr) {
        const lastLocation = JSON.parse(lastLocationStr);
        const distance = getDistanceFromLatLonInMeters(lastLocation.lat, lastLocation.lng, latitude, longitude);
        
        // Robust background drift & speed jitter filter:
        // 1. If accuracy is poor (>15m), require an 80m jump.
        // 2. If speed is low (< 1.2 m/s or < 4.3 km/h), they are stationary/drifting.
        //    For stationary states, require at least a 60m jump to filter out Wi-Fi/cellular drift.
        // 3. Otherwise, if actively moving, require a standard 15m update jump.
        const speedVal = speed !== null && speed !== undefined ? speed : 0;
        const hasExplicitSpeed = speed !== null && speed !== undefined;
        const isStationary = hasExplicitSpeed ? speedVal < 1.2 : true;
        const requiredThreshold = accuracy > 15 ? 80 : (isStationary ? 60 : 15);
        
        if (distance < requiredThreshold) {
          // console.log(`📍 BackgroundTask: Ignored drift (${distance.toFixed(1)}m < ${requiredThreshold}m anchor threshold for accuracy ${accuracy.toFixed(1)}m)`);
          return;
        }
      }
      
      let addressStr = '';
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocoded && geocoded.length > 0) {
          const res = geocoded[0];
          addressStr = [res.street || res.name, res.district || res.subregion, res.city, res.region].filter(Boolean).join(', ');
        }
      } catch {}
      
      console.log(`📍 BackgroundTask: Employee moved! Captured [${latitude}, ${longitude}] | Address: ${addressStr || 'N/A'} | Acc: ${accuracy}m | Speed: ${speed}m/s`);
      
      const newCoord = {
        lat: latitude,
        lng: longitude,
        speed: speed || 0,
        accuracy: accuracy || 0,
        heading: heading || 0,
        timestamp: new Date(timestamp).toISOString(),
      };
      
      // Update last recorded location
      await storage.setItem('last_recorded_location', JSON.stringify(newCoord));
      
      // 1. Attempt to stream location update via Socket
      let sentViaSocket = false;
      const socket = await socketService.connect();
      if (socket && socket.connected) {
        sentViaSocket = socketService.emitLocationPing({
          sessionId,
          ...newCoord,
        });
      }
      
      if (sentViaSocket) {
        console.log('📍 BackgroundTask: Streamed coordinate successfully via Socket!');
      } else {
        // 2. Socket offline: fallback to REST API
        console.log('📍 BackgroundTask: Socket offline. Attempting REST API fallback.');
        const token = await storage.getItem('userToken');
        if (token) {
          try {
            await axios.post(`${BASE_URL}/tracking/update`, {
              sessionId,
              coordinates: [newCoord],
            }, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 6000,
            });
            console.log('📍 BackgroundTask: Uploaded coordinate successfully via REST API!');
          } catch (apiErr) {
            // 3. Completely disconnected: cache coordinate in local offline queue
            console.log('📍 BackgroundTask: Internet unavailable. Caching coordinate locally.');
            const queueKey = 'offline_request_queue';
            const currentQueueStr = await storage.getItem(queueKey);
            const queue = currentQueueStr ? JSON.parse(currentQueueStr) : [];
            
            queue.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              endpoint: '/tracking/update',
              method: 'POST',
              data: { sessionId, coordinates: [newCoord] },
              timestamp: new Date().toISOString(),
            });
            
            await storage.setItem(queueKey, JSON.stringify(queue));
          }
        }
      }
    } catch (e) {
      console.error('📍 BackgroundTask: Failed to process background tick:', e);
    }
  }
});
