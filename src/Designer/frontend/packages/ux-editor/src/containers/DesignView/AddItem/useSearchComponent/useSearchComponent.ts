import { useState, type ChangeEvent } from 'react';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../../types/global';

const getAllLabelWords = (toolbarItem: IToolbarElement, t: (key: string) => string): string[] => {
  const translatedLabel = t('ux_editor.component_title.' + toolbarItem.type).toLowerCase();
  const englishLabel = toolbarItem.label.toLowerCase();
  return [translatedLabel, englishLabel];
};

const doesToolbarItemMatchSearch = (
  toolbarItem: IToolbarElement,
  search: string,
  t: (key: string) => string,
): boolean => {
  return getAllLabelWords(toolbarItem, t).some((word) => word.includes(search));
};

const filterToolbarItems = (
  items: IToolbarElement[],
  search: string,
  t: (key: string) => string,
): IToolbarElement[] => {
  if (!search) return items;
  return items.filter((toolbarItem) => doesToolbarItemMatchSearch(toolbarItem, search, t));
};

type UseSearchComponentProps = {
  availableComponents: KeyValuePairs<IToolbarElement[]>;
  t: (key: string) => string;
};

export function useSearchComponent({ availableComponents, t }: UseSearchComponentProps) {
  const [searchText, setSearchText] = useState('');

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);

  const filteredComponents = Object.entries(availableComponents).reduce(
    (acc, [category, items]) => {
      const search = searchText.toLowerCase();
      const filteredItems = filterToolbarItems(items, search, t);
      if (filteredItems.length > 0) acc[category] = filteredItems;
      return acc;
    },
    {} as KeyValuePairs<IToolbarElement[]>,
  );

  return {
    searchText,
    handleSearchChange,
    filteredComponents,
  };
}
