import { useState, type ChangeEvent } from 'react';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../../types/global';

const getAllLabelWords = (toolbarItem: IToolbarElement, t: (key: string) => string): string[] => {
  const translatedLabel = t('ux_editor.component_title.' + toolbarItem.type).toLowerCase();
  const englishLabel = toolbarItem.label.toLowerCase();
  return [...translatedLabel.split(/\s+/), ...englishLabel.split(/\s+/)];
};

const doesToolbarItemMatchSearch = (
  toolbarItem: IToolbarElement,
  search: string,
  t: (key: string) => string,
): boolean => {
  const searchLower = search.toLowerCase();
  const allLabelWords = getAllLabelWords(toolbarItem, t);
  const searchWords = searchLower.split(/\s+/).filter((word) => word.length > 0);
  if (searchWords.length === 0) return true;
  return searchWords.every((searchWord) =>
    allLabelWords.some((labelWord) => labelWord.includes(searchWord)),
  );
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
