import React from 'react';
import type { IToolbarElement } from '../../../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ItemCategory, type ItemCategoryProps } from './ItemCategory';
import { renderWithProviders } from '../../../../testing/mocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const validCategories = [
  'advanced',
  'attachment',
  'button',
  'container',
  'form',
  'info',
  'select',
  'text',
];
const MockInputIcon = () => <div data-testid='input-icon'>Input Icon</div>;
const MockButtonIcon = () => <div data-testid='button-icon'>Button Icon</div>;

describe('ItemCategory', () => {
  const mockItems: IToolbarElement[] = [
    {
      type: ComponentType.Input,
      label: 'Input Field',
      icon: MockInputIcon,
    },
    {
      type: ComponentType.Button,
      label: 'Button',
      icon: MockButtonIcon,
    },
  ];
  const mockSetAddedItem = jest.fn();
  const mockGenerateComponentId = jest.fn().mockReturnValue('generated-id');
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it.each(validCategories)(
    'should render elements with heading ux_editor.component_category.%s',
    (category) => {
      renderItemCategory({ category });
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
        textMock(`ux_editor.component_category.${category}`),
      );
    },
  );

  it('should call setAddedItem when ComponentButton is clicked', async () => {
    const user = userEvent.setup();
    renderItemCategory({
      items: mockItems,
      setAddedItem: mockSetAddedItem,
      generateComponentId: mockGenerateComponentId,
    });
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(mockSetAddedItem).toHaveBeenCalledWith({
      componentType: mockItems[0].type,
      componentId: 'generated-id',
    });
    expect(mockGenerateComponentId).toHaveBeenCalledWith(mockItems[0].type);
  });
});

const renderItemCategory = (props: Partial<ItemCategoryProps> = {}) => {
  const allProps: ItemCategoryProps = {
    items: [],
    category: validCategories[0],
    selectedItemType: ComponentType.Input,
    setAddedItem: jest.fn(),
    generateComponentId: jest.fn().mockReturnValue('generated-id'),
    ...props,
  };
  return renderWithProviders(<ItemCategory {...allProps} />, {});
};
