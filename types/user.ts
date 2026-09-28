// This file defines the User type as expected by the user-service API
export interface User {
  id: number;
  name: string;
  email?: string;
  age: number;
}

export interface UserResponse {
  success?: boolean;
  data?: User;
  error?: string;
}

export interface UsersResponse {
  success?: boolean;
  data?: User[];
  count?: number;
  error?: string;
}
