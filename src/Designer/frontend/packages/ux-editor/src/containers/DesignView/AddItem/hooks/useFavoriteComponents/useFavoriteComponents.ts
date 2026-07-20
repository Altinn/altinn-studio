import { useLocalStorage } from '@studio/components/src/hooks/useLocalStorage';
import type { AddedItem } from '../../types';

type FavoriteComponentType = AddedItem['componentType'];

const FAVORITE_COMPONENTS_STORAGE_KEY = 'favoriteComponents';

export type UseFavoriteComponents = {
  favorites: FavoriteComponentType[];
  isFavorite: (componentType: FavoriteComponentType) => boolean;
  toggleFavorite: (componentType: FavoriteComponentType) => void;
};

/**
 * Reads and updates the user's favorite components, persisted in local storage.
 */
export const useFavoriteComponents = (): UseFavoriteComponents => {
  const [favorites = [], setFavorites] = useLocalStorage<FavoriteComponentType[]>(
    FAVORITE_COMPONENTS_STORAGE_KEY,
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
