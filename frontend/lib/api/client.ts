// API client configuration
// Axios instance with auth interceptor

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage if exists
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('auth-token') 
      : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
      
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        // Clear auth and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
          // Optionally redirect to login
          // window.location.href = '/login';
        }
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Bounties
  bounties: {
    getAll: () => apiClient.get('/bounties'),
    getById: (id: number) => apiClient.get(`/bounties/${id}`),
    create: (data: any) => apiClient.post('/bounties', data),
  },
  
  // Videos
  videos: {
    getAll: () => apiClient.get('/videos'),
    getById: (id: number) => apiClient.get(`/videos/${id}`),
    register: (data: any) => apiClient.post('/videos/register', data),
    getProgress: (id: number) => apiClient.get(`/videos/${id}/progress`),
    claim: (id: number, milestoneId: number) => 
      apiClient.post(`/videos/${id}/claim`, { milestoneId }),
  },
  
  // Creator
  creator: {
    getAll: () => apiClient.get('/creators'),
    getProfile: (address: string) => apiClient.get(`/creators/${address}`),
    getVideos: (address: string) => apiClient.get(`/creators/${address}/videos`),
    getStats: (address: string) => apiClient.get(`/creators/${address}/stats`),
  },
  
  // Admin
  admin: {
    getQueue: () => apiClient.get('/admin/approval-queue'),
    approve: (videoId: number, reason?: string) => 
      apiClient.post(`/admin/videos/${videoId}/approve`, { reason }),
    reject: (videoId: number, reason: string) => 
      apiClient.post(`/admin/videos/${videoId}/reject`, { reason }),
  },
};

export default apiClient;