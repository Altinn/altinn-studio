import { useSearchComponent } from './useSearchComponent';
import { act } from 'react';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import { renderHookWithProviders } from '../../../../testing/mocks';
import { waitFor } from '@testing-library/react';
import type { TestCase } from './types';

const MockIcon = () => null;
const textInputValue = 'Text';

const mockAvailableComponents: KeyValuePairs<IToolbarElement[]> = {
  category1: [
    { type: ComponentType.TextArea, label: 'Text Component', icon: MockIcon },
    { type: ComponentType.Button, label: 'Button Component', icon: MockIcon },
    { type: ComponentType.Checkboxes, label: 'Avmerkingsbokser', icon: MockIcon },
  ],
  category2: [{ type: ComponentType.Image, label: 'Image Component', icon: MockIcon }],
};

const testCases: TestCase[] = [
  {
    description: 'should filter by partial text match',
    searchText: 'text',
    expected: {
      category1: [{ type: ComponentType.TextArea, label: 'Text Component', icon: MockIcon }],
    },
  },
  {
    description: 'should filter by button match',
    searchText: 'button',
    expected: {
      category1: [{ type: ComponentType.Button, label: 'Button Component', icon: MockIcon }],
    },
  },
  {
    description: 'should return empty object when no matches found',
    searchText: 'nonexistent',
    expected: {},
  },
  {
    description: 'should be case insensitive',
    searchText: 'TEXT',
    expected: {
      category1: [{ type: ComponentType.TextArea, label: 'Text Component', icon: MockIcon }],
    },
  },
];

const translations = {
  'ux_editor.component_title.TextArea': 'tekstfelt',
  'ux_editor.component_title.Button': 'Send inn',
  'ux_editor.component_title.Image': 'Bilde',
  'ux_editor.component_title.Checkboxes': 'Avmerkingsbokser',
};

jest.useFakeTimers();

describe('useSearchComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initial state', () => {
    it('should return all components when searchText is empty', () => {
      const { result } = renderUseSearchComponent();
      expect(result.current.filteredComponents).toEqual(mockAvailableComponents);
      expect(result.current.searchText).toBe('');
      expect(result.current.debouncedSearchText).toBe('');
    });
  });

  describe('Event handlers', () => {
    it('should clear searchText when handleClear is called', async () => {
      const { result } = renderUseSearchComponent();
      act(() => {
        result.current.handleSearchChange({ target: { value: textInputValue } });
      });
      expect(result.current.searchText).toBe(textInputValue);
      act(() => {
        result.current.handleClear();
      });
      expect(result.current.searchText).toBe('');
    });

    it('should reset searchText when Escape key is pressed', async () => {
      const { result } = renderUseSearchComponent();
      act(() => {
        result.current.handleSearchChange({ target: { value: textInputValue } });
      });
      expect(result.current.searchText).toBe(textInputValue);
      act(() => {
        result.current.handleEscape({ code: 'Escape' } as KeyboardEvent);
      });
      expect(result.current.searchText).toBe('');
    });
  });

  describe('Search filtering', () => {
    testCases.forEach(({ description, searchText, expected }) => {
      it(description, async () => {
        const { result } = renderUseSearchComponent();
        await waitFor(() => {
          result.current.handleSearchChange({ target: { value: searchText } });
        });
        await waitFor(() => {
          expect(result.current.filteredComponents).toEqual(expected);
        });
      });
    });
  });

  describe('Translation support', () => {
    it('should find component by searching with norwegian word', async () => {
      const { result } = renderUseSearchComponent();
      await waitFor(() => {
        result.current.handleSearchChange({ target: { value: 'tekstfelt' } });
      });
      await waitFor(() => {
        expect(result.current.filteredComponents).toEqual({
          category1: [{ type: ComponentType.TextArea, label: 'Text Component', icon: MockIcon }],
        });
      });
    });

    it('should find component by searching with english word', async () => {
      const { result } = renderUseSearchComponent();
      await waitFor(() => {
        result.current.handleSearchChange({ target: { value: textInputValue } });
      });
      await waitFor(() => {
        expect(result.current.filteredComponents).toEqual({
          category1: [{ type: ComponentType.TextArea, label: 'Text Component', icon: MockIcon }],
        });
      });
    });
  });
});

const renderUseSearchComponent = (
  overrides: Partial<Parameters<typeof useSearchComponent>[0]> = {},
) => {
  return renderHookWithProviders(() =>
    useSearchComponent({
      availableComponents: mockAvailableComponents,
      disableDebounce: true,
      t: (key: string) => translations[key] || key,
      ...overrides,
    }),
  );
};
