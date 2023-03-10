import { get, post } from '../../packages/shared/src/utils/networking';
import { userCurrentPath, userLogoutPath } from 'app-shared/api-paths';

export type User = {
  avatar_url: string;
  email: string;
  full_name: string;
  id: number;
  login: string;
};

const getCurrentUser = async (): Promise<User> => {
  return await get(`${userCurrentPath()}`);
};

const logout = async (): Promise<void> => {
  return await post(userLogoutPath());
};

export type UserService = {
  getCurrentUser: () => Promise<User>;
  logout: () => Promise<void>;
};

export const userService: UserService = {
  getCurrentUser,
  logout,
};
