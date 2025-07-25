import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useDebounce } from '@studio/hooks';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../../types/global';

const DEBOUNCE_DISABLED_TIME_MS = 1;
const DEFAULT_DEBOUNCE_TIME_MS = 500;

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
  disableDebounce?: boolean;
  t: (key: string) => string;
};

export function useSearchComponent({
  availableComponents,
  disableDebounce,
  t,
}: UseSearchComponentProps) {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const { debounce } = useDebounce({
    debounceTimeInMs: disableDebounce ? DEBOUNCE_DISABLED_TIME_MS : DEFAULT_DEBOUNCE_TIME_MS,
  });

  useEffect(() => {
    debounce(() => setDebouncedSearchText(searchText));
  }, [searchText, debounce]);

  const handleClear = () => setSearchText('');
  const handleEscape = (event: KeyboardEvent) => event.code === 'Escape' && setSearchText('');
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);

  const filteredComponents = Object.entries(availableComponents).reduce(
    (acc, [category, items]) => {
      const search = debouncedSearchText.trim().toLowerCase();
      const filteredItems = filterToolbarItems(items, search, t);
      if (filteredItems.length > 0) acc[category] = filteredItems;
      return acc;
    },
    {} as KeyValuePairs<IToolbarElement[]>,
  );

  return {
    searchText,
    setSearchText,
    debouncedSearchText,
    handleClear,
    handleEscape,
    handleSearchChange,
    filteredComponents,
  };
}
