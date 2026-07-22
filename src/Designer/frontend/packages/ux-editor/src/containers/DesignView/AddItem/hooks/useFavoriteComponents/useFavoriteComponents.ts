import { useLocalStorage } from '@studio/components/src/hooks/useLocalStorage';
import { useUserQuery } from 'app-shared/hooks/queries';
import type { AddedItem } from '../../types';

type FavoriteComponentType = AddedItem['componentType'];

const getFavoriteComponentsStorageKey = (login?: string): string => `favoriteComponents:${login}`;

export type UseFavoriteComponents = {
  favorites: FavoriteComponentType[];
  isFavorite: (componentType: FavoriteComponentType) => boolean;
  toggleFavorite: (componentType: FavoriteComponentType) => void;
};

/**
 * Reads and updates the current user's favorite components, persisted per user in local storage.
 */
export const useFavoriteComponents = (): UseFavoriteComponents => {
  const { data: user } = useUserQuery();
  const [favorites = [], setFavorites] = useLocalStorage<FavoriteComponentType[]>(
    getFavoriteComponentsStorageKey(user?.login),
    [],
  );

  const isFavorite = (componentType: FavoriteComponentType): boolean =>
    favorites.includes(componentType);

  const toggleFavorite = (componentType: FavoriteComponentType): void => {
    const updatedFavorites = isFavorite(componentType)
      ? favorites.filter((favorite) => favorite !== componentType)
      : [...favorites, componentType];
    setFavorites(updatedFavorites);
  };

  return { favorites, isFavorite, toggleFavorite };
};
