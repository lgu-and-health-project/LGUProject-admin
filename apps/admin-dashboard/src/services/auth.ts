import { fetchApi } from './apiClient';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export const authService = {
  /**
   * Authenticate a user. Token is handled automatically via HttpOnly cookies.
   */
  login: (credentials: LoginCredentials) => {
    return fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  /**
   * Log the user out and clear HttpOnly cookie on backend.
   */
  logout: () => {
    return fetchApi('/auth/logout', { 
      method: 'POST' 
    });
  }
};
