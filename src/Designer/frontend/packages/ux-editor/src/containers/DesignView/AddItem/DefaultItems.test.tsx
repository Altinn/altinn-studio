import React from 'react';
import { screen } from '@testing-library/react';
import { DefaultItems, type DefaultItemsProps } from './DefaultItems';
import { ComponentType } from 'app-shared/types/ComponentType';
import { CircleFillIcon } from 'libs/studio-icons/src';
import { StudioButton } from '@studio/components-legacy';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';

const availableComponents = [
  {
    type: ComponentType.TextArea,
    label: 'label',
    icon: CircleFillIcon,
  },
  {
    type: ComponentType.Input,
    label: 'label',
    icon: CircleFillIcon,
  },
];

describe('DefaultItems', () => {
  it('should render default items', () => {
    renderDefaultItems({});
    expect(
      screen.getByText(textMock('ux_editor.add_item.select_component_header')),
    ).toBeInTheDocument();
  });

  it('should render all available components', () => {
    renderDefaultItems({});
    availableComponents.forEach((component) => {
      expect(
        screen.getByRole('button', {
          name: textMock(`ux_editor.component_title.${component.type}`),
        }),
      ).toBeInTheDocument();
    });
  });

  it('should render show all button', () => {
    renderDefaultItems({});
    expect(screen.getByRole('button', { name: 'Show all' })).toBeInTheDocument();
  });
});

const renderDefaultItems = (props: Partial<DefaultItemsProps>) => {
  const defaultProps: DefaultItemsProps = {
    availableComponents,
    onCancel: jest.fn(),
    onAddItem: jest.fn(),
    showAllButton: <StudioButton>Show all</StudioButton>,
  };
  return renderWithProviders(<DefaultItems {...defaultProps} />);
};
