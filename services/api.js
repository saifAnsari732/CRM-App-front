import axios from 'axios';
import { storage } from './storage';
import { Platform } from 'react-native';

// export const BASE_URL = Platform.select({
//   android: 'http://192.168.0.108:5000/api',
//   ios: 'http://192.168.0.108:5000/api',
//   default: 'http://localhost:5000/api',
// });

export const getAvatarUrl = (avatar) => {
  if (!avatar || typeof avatar !== 'string') return null;
  const clean = avatar.trim();
  if (clean === '' || clean === 'null' || clean === 'undefined') return null;
  
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  
  const baseUrlWithoutApi = 'https://crm-app-xh1t.onrender.com';
  if (clean.startsWith('/')) {
    return `${baseUrlWithoutApi}${clean}`;
  }
  return `${baseUrlWithoutApi}/${clean}`;
};

export const BASE_URL = 'https://crm-app-xh1t.onrender.com/api';

console.log('Using Active API Base URL:', BASE_URL);

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

let refreshTokenPromise = null;

/**
 * Request interceptor: Attach token dynamically from mobile storage
 */
API.interceptors.request.use(async (config) => {
  try {
    const token = await storage.getItem('userToken') || await storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Error in request interceptor:', e);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Response interceptor: Handle 401 with token refresh
 */
API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Handle 401 (Unauthorized)
    const isAuthRequest = originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh-token');
    
    if (err.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        // Only refresh token once (prevent multiple refresh requests)
        if (!refreshTokenPromise) {
          refreshTokenPromise = API.post('/auth/refresh-token');
        }

        const { data } = await refreshTokenPromise;
        refreshTokenPromise = null;

        if (data.token) {
          await storage.setItem('userToken', data.token);
          await storage.setItem('token', data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return API(originalRequest);
        }
      } catch (refreshErr) {
        refreshTokenPromise = null;
        // Refresh failed - clear mobile auth
        await storage.removeItem('userToken');
        await storage.removeItem('token');
        await storage.removeItem('user');
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  logout: () => API.post('/auth/logout'),
  refreshToken: () => API.post('/auth/refresh-token'),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
};

// ─── Tracking ──────────────────────────────────────────────────────────────
export const trackingAPI = {
  start: (data) => API.post('/tracking/start', data),
  update: (data) => API.post('/tracking/update', data),
  stop: (data) => API.post('/tracking/stop', data),
  getToday: () => API.get('/tracking/today'),
  getLive: () => API.get('/tracking/live'),
  getLiveLocations: () => API.get('/tracking/live-locations'),
  getSession: (id) => API.get(`/tracking/session/${id}`),
  geocode: (lat, lng) => API.get(`/tracking/geocode?lat=${lat}&lng=${lng}`),
  getEmployeeReport: (employeeId, params) => API.get(`/tracking/report/employee/${employeeId}`, { params }),
  deleteHistory: (employeeId) => API.delete(`/tracking/history/employee/${employeeId}`),
};

// ─── Meetings ─────────────────────────────────────────────────────────────
export const meetingAPI = {
  create: (data) => API.post('/meetings', data),
  getMy: (params) => API.get('/meetings/my', { params }),
  update: (id, data) => API.put(`/meetings/${id}`, data),
  getAll: (params) => API.get('/meetings/all', { params }),
};

// ─── Expenses ─────────────────────────────────────────────────────────────
export const expenseAPI = {
  create: (data) => API.post('/expenses', data),
  getMy: (params) => API.get('/expenses/my', { params }),
  getAll: (params) => API.get('/expenses/all', { params }),
  approve: (id, data) => API.put(`/expenses/${id}/approve`, data),
};

// ─── Admin ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => API.get('/admin/dashboard'),
  getEmployees: (params) => API.get('/admin/employees', { params }),
  approveEmployee: (id) => API.put(`/admin/employees/${id}/approve`),
  toggleBlock: (id) => API.put(`/admin/employees/${id}/block`),
  updateEmployee: (id, data) => API.put(`/admin/employees/${id}`, data),
  getAttendance: (params) => API.get('/admin/attendance', { params }),
  getHistory: (params) => API.get('/admin/tracking-history', { params }),
  getConsolidatedReport: (params) => API.get('/admin/reports/consolidated', { params }),
};

// ─── Employees ────────────────────────────────────────────────────────────
export const employeeAPI = {
  getAll: () => API.get('/employees'),
  getById: (id) => API.get(`/employees/${id}`),
  update: (id, data) => API.put(`/employees/${id}`, data),
  delete: (id) => API.delete(`/employees/${id}`),
};

// ─── Attendance ───────────────────────────────────────────────────────────
export const attendanceAPI = {
  getMy: () => API.get('/attendance/my'),
  getToday: () => API.get('/attendance/today'),
};

// ─── Notifications ────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll: () => API.get('/notifications'),
  readAll: () => API.put('/notifications/read-all'),
};

// ─── Upload ───────────────────────────────────────────────────────────────
export const uploadAPI = {
  getAuth: () => API.get('/upload/auth'),
  uploadImage: (data) => API.post('/upload/image', data),
};

// ─── Leaves ───────────────────────────────────────────────────────────────
export const leaveAPI = {
  apply: (data) => API.post('/leaves/apply', data),
  getMy: () => API.get('/leaves/my'),
  getAll: (params) => API.get('/leaves/all', { params }),
  updateStatus: (id, data) => API.patch(`/leaves/${id}/status`, data),
};

// ─── Tasks ────────────────────────────────────────────────────────────────
export const taskAPI = {
  create: (data) => API.post('/tasks', data),
  getAll: (params) => API.get('/tasks/all', { params }),
  getMy: (params) => API.get('/tasks/my', { params }),
  updateStatus: (id, data) => API.patch(`/tasks/${id}/status`, data),
};

// ─── Leads ────────────────────────────────────────────────────────────────
export const leadAPI = {
  create: (data) => API.post('/leads', data),
  getAll: () => API.get('/leads'),
  update: (id, data) => API.put(`/leads/${id}`, data),
  delete: (id) => API.delete(`/leads/${id}`),
};

// ─── Travel ───────────────────────────────────────────────────────────────
export const travelAPI = {
  create: (data) => API.post('/travel', data),
  getAll: (params) => API.get('/travel', { params }),
  delete: (id) => API.delete(`/travel/${id}`),
};

// ─── Dashboard Stats APIs (Extra compatibility) ───────────────────────────
export const dashboardAPI = {
  getStats: () => API.get('/dashboard/stats'),
};

// ─── BACKWARD COMPATIBILITY MAPPINGS FOR SCREEN IMPORTS ────────────────────
export const authApi = {
  login: (email, password) => authAPI.login({ email, password }),
  register: (data) => authAPI.register(data),
  getMe: () => authAPI.getMe(),
  updateProfile: (data) => authAPI.updateProfile(data),
  changePassword: (data) => authAPI.changePassword(data),
};

export const trackingApi = {
  startTracking: (sessionId, startTime, lat, lng, startAddress = '') => {
    return trackingAPI.start({ sessionId, startTime, lat, lng, startAddress });
  },
  updateLocation: (sessionId, coordinates, totalDistance = 0) => {
    return trackingAPI.update({ sessionId, coordinates, totalDistance });
  },
  stopTracking: (sessionId, endTime, endAddress = '', totalDistance = 0) => {
    return trackingAPI.stop({ sessionId, endTime, endAddress, totalDistance });
  },
  getTodaySessions: () => trackingAPI.getToday(),
  getLiveEmployees: () => trackingAPI.getLive(),
  getSessionRoute: (id) => trackingAPI.getSession(id),
};

export const meetingApi = {
  create: (data) => meetingAPI.create(data),
  getMy: (params) => meetingAPI.getMy(params),
  update: (id, data) => meetingAPI.update(id, data),
};

export const expenseApi = {
  create: (data) => expenseAPI.create(data),
  getMy: (params) => expenseAPI.getMy(params),
};

export const adminApi = {
  getStats: () => adminAPI.getDashboard(),
  getAllEmployees: (params) => adminAPI.getEmployees(params),
  approveEmployee: (id) => adminAPI.approveEmployee(id),
  toggleBlock: (id) => adminAPI.toggleBlock(id),
  getAttendanceReport: (date) => adminAPI.getAttendance({ date }),
  getAllMeetings: (params) => meetingAPI.getAll(params),
  getAllExpenses: (params) => expenseAPI.getAll(params),
  approveExpense: (id, approved = true, reason = '') => {
    const status = approved ? 'approved' : 'rejected';
    return expenseAPI.approve(id, { status, rejectionReason: reason });
  },
};

export const employeeApi = {
  getMe: () => employeeAPI.getAll().then(res => {
    // compatibility mapping
    return res;
  }),
  getById: (id) => employeeAPI.getById(id),
  update: (id, data) => employeeAPI.update(id, data),
  delete: (id) => employeeAPI.delete(id),
};

export const attendanceApi = {
  getMyHistory: (month, year) => attendanceAPI.getMy({ month, year }),
  getTodayRecord: () => attendanceAPI.getToday(),
};

export const leaveApi = {
  apply: (data) => leaveAPI.apply(data),
  getMy: () => leaveAPI.getMy(),
  getAll: (params) => leaveAPI.getAll(params),
  updateStatus: (id, status, reason = '') => leaveAPI.updateStatus(id, { status, rejectionReason: reason }),
};

export const taskApi = {
  create: (data) => taskAPI.create(data),
  getMy: (params) => taskAPI.getMy(params),
  getAll: (params) => taskAPI.getAll(params),
  updateStatus: (id, status) => taskAPI.updateStatus(id, { status }),
};

export const notificationApi = {
  getAll: () => notificationAPI.getAll(),
  markRead: (id) => API.put(`/notifications/${id}/read`), // Inline fallback
  markAllRead: () => notificationAPI.readAll(),
};

export const dashboardApi = {
  getStats: () => dashboardAPI.getStats(),
};

export default API;
