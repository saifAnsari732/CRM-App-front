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
      let lastLocation = null;
      if (lastLocationStr) {
        try {
          lastLocation = JSON.parse(lastLocationStr);
          const distance = getDistanceFromLatLonInMeters(lastLocation.lat, lastLocation.lng, latitude, longitude);
          
          // Relaxed drift filter:
          // 1. If accuracy is poor (>35m), require at least a 35m jump to filter out cell tower leaps.
          // 2. If accuracy is good (<=35m), require a standard 15m jump (industry standard for active walking/driving).
          const requiredThreshold = accuracy > 35 ? 35 : 15;
          
          if (distance < requiredThreshold) {
            // console.log(`📍 BackgroundTask: Ignored drift (${distance.toFixed(1)}m < ${requiredThreshold}m threshold)`);
            return;
          }
        } catch (parseErr) {
          console.error('📍 BackgroundTask: Error parsing last location:', parseErr);
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
      
      // Update last recorded location in storage
      await storage.setItem('last_recorded_location', JSON.stringify(newCoord));
      
      // Helper to accumulate distance locally
      const accumulateDistanceLocally = async (prevLocation) => {
        if (prevLocation) {
          try {
            const dMeters = getDistanceFromLatLonInMeters(prevLocation.lat, prevLocation.lng, latitude, longitude);
            const dKm = dMeters / 1000.0;
            
            const accDistStr = await storage.getItem('tracking_accumulated_distance');
            let accDist = accDistStr ? parseFloat(accDistStr) : 0.0;
            accDist += dKm;
            await storage.setItem('tracking_accumulated_distance', accDist.toFixed(2));
            console.log(`📍 BackgroundTask: Accumulated distance updated locally: ${accDist.toFixed(2)} km`);
          } catch (e) {
            console.error('📍 BackgroundTask: Local distance accumulation failed:', e);
          }
        }
      };

      // Always use REST API for background tasks to prevent silent TCP drops on mobile OSes when screen is off
      console.log('📍 BackgroundTask: Attempting REST API sync...');
      const token = await storage.getItem('userToken');
      if (token) {
        try {
          const response = await axios.post(`${BASE_URL}/tracking/update`, {
            sessionId,
            coordinates: [newCoord],
          }, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 6000,
          });
          console.log('📍 BackgroundTask: Uploaded coordinate successfully via REST API!');
          if (response.data && response.data.success) {
            const serverDistance = response.data.totalDistance || 0.0;
            await storage.setItem('tracking_accumulated_distance', serverDistance.toFixed(2));
            console.log(`📍 BackgroundTask: Distance synced with server: ${serverDistance.toFixed(2)} km`);
          } else {
            await accumulateDistanceLocally(lastLocation);
          }
        } catch (apiErr) {
          // 3. Completely disconnected: cache coordinate in local offline queue
          console.log('📍 BackgroundTask: Internet unavailable. Caching coordinate locally.');
          await accumulateDistanceLocally(lastLocation);
          
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
      } else {
        await accumulateDistanceLocally(lastLocation);
      }
    } catch (e) {
      console.error('📍 BackgroundTask: Failed to process background tick:', e);
    }
  }
});
