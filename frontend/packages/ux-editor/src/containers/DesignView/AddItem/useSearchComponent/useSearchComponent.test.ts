import { useSearchComponent } from './useSearchComponent';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import { renderHookWithProviders } from '../../../../testing/mocks';
import { waitFor } from '@testing-library/react';
import type { TestCase } from './types';

const MockIcon = () => null;
const textInputValue = 'Text';
const textLabelValue = 'Text Component';
const textButtonValue = 'Button Component';

const mockAvailableComponents: KeyValuePairs<IToolbarElement[]> = {
  category1: [
    { type: ComponentType.TextArea, label: textLabelValue, icon: MockIcon },
    { type: ComponentType.Button, label: textButtonValue, icon: MockIcon },
    { type: ComponentType.Checkboxes, label: 'Avmerkingsbokser', icon: MockIcon },
  ],
  category2: [{ type: ComponentType.Image, label: 'Image Component', icon: MockIcon }],
};

const testCases: TestCase[] = [
  {
    description: 'should filter by partial text match',
    searchText: 'text',
    expected: {
      category1: [{ type: ComponentType.TextArea, label: textLabelValue, icon: MockIcon }],
    },
  },
  {
    description: 'should filter by button match',
    searchText: 'button',
    expected: {
      category1: [{ type: ComponentType.Button, label: textButtonValue, icon: MockIcon }],
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
      category1: [{ type: ComponentType.TextArea, label: textLabelValue, icon: MockIcon }],
    },
  },
  {
    description: 'should handle search with multiple spaces between words',
    searchText: 'button component',
    expected: {
      category1: [{ type: ComponentType.Button, label: textButtonValue, icon: MockIcon }],
    },
  },
  {
    description: 'should handle search with only whitespace',
    searchText: '   ',
    expected: mockAvailableComponents,
  },
  {
    description: 'should handle search with empty string',
    searchText: '',
    expected: mockAvailableComponents,
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
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should return all components when searchText is empty', () => {
      const { result } = renderUseSearchComponent();
      expect(result.current.filteredComponents).toEqual(mockAvailableComponents);
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
          category1: [{ type: ComponentType.TextArea, label: textLabelValue, icon: MockIcon }],
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
          category1: [{ type: ComponentType.TextArea, label: textLabelValue, icon: MockIcon }],
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
      t: (key: string) => translations[key] || key,
      ...overrides,
    }),
  );
};
