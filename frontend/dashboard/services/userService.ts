import { User } from 'app-shared/types/User';
import { get, post } from '../../packages/shared/src/utils/networking';
import { userCurrentPath, userLogoutPath } from 'app-shared/api-paths';

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
export { User };

