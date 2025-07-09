import React from 'react';
import { screen } from '@testing-library/react';
import { AddItemContent, type AddItemContentProps } from './AddItemContent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { IToolbarElement } from '../../../types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../testing/mocks';

describe('AddItemContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const MockIcon = () => <span>Icon</span>;

  const mockAvailableComponents: KeyValuePairs<IToolbarElement[]> = {
    Skjema: [
      { type: ComponentType.Input, label: 'Lite tekstfelt', icon: MockIcon },
      { type: ComponentType.Datepicker, label: 'Dato', icon: MockIcon },
    ],
    Tekst: [{ type: ComponentType.Header, label: 'Tittel', icon: MockIcon }],
  };

  it('should render the search field label', () => {
    renderAddItemContent();
    const searchTitle = screen.getByText(textMock('ux_editor.add_item.component_search_label'));
    expect(searchTitle).toBeInTheDocument();
  });

  it.each(Object.entries(mockAvailableComponents))(
    'should render each category and its items',
    (category, items) => {
      renderAddItemContent({ availableComponents: mockAvailableComponents });
      expect(
        screen.getByText(textMock(`ux_editor.component_category.${category}`)),
      ).toBeInTheDocument();
      items.forEach((item) => {
        expect(
          screen.getByText(textMock(`ux_editor.component_title.${item.type}`)),
        ).toBeInTheDocument();
      });
    },
  );

  const defaultProps: AddItemContentProps = {
    item: null,
    setItem: jest.fn(),
    onAddItem: jest.fn(),
    onCancel: jest.fn(),
    availableComponents: mockAvailableComponents,
  };

  const renderAddItemContent = (props: Partial<AddItemContentProps> = {}) => {
    return renderWithProviders(<AddItemContent {...defaultProps} {...props} />);
  };
});
