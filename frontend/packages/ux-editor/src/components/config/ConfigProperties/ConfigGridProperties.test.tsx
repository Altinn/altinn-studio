import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigGridProperties, type ConfigGridPropertiesProps } from './ConfigGridProperties';
import { componentMocks } from '../../../testing/componentMocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

describe('ConfigGridProperties', () => {
  it('should toggle close button and grid width text when the open and close buttons are clicked', async () => {
    const user = userEvent.setup();
    render({
      props: {
        hasGridProperty: true,
        component: componentMocks.Input,
      },
    });
    const openGridButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.grid'),
    });
    await user.click(openGridButton);
    expect(screen.getByText(textMock('ux_editor.component_properties.grid'))).toBeInTheDocument();
    const widthText = screen.getByText(textMock('ux_editor.modal_properties_grid'));
    expect(widthText).toBeInTheDocument();

    await closeCard(user, 'grid');
    expect(widthText).not.toBeInTheDocument();
  });

  it('should not render grid width text if grid button is not clicked', async () => {
    const user = userEvent.setup();
    render({
      props: {
        hasGridProperty: true,
        component: componentMocks.Input,
      },
    });
    expect(screen.queryByText(textMock('ux_editor.modal_properties_grid'))).not.toBeInTheDocument();
    const openGridButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.grid'),
    });
    await user.click(openGridButton);
    expect(screen.getByText(textMock('ux_editor.component_properties.grid'))).toBeInTheDocument();

    const widthText = screen.getByText(textMock('ux_editor.modal_properties_grid'));
    expect(widthText).toBeInTheDocument();

    await closeCard(user, 'grid');
    expect(widthText).not.toBeInTheDocument();
  });

  const render = ({
    props = {},
    queries = {},
  }: {
    props?: Partial<ConfigGridPropertiesProps>;
    queries?: Partial<ServicesContextProps>;
  }) => {
    const defaultProps: ConfigGridPropertiesProps = {
      hasGridProperty: false,
      component: componentMocks.Input,
      handleComponentUpdate: jest.fn(),
    };
    return renderWithProviders(<ConfigGridProperties {...defaultProps} {...props} />, {
      queries,
    });
  };
});

const closeCard = async (user: UserEvent, propertyKey: string) => {
  const closeButton = await screen.findByRole('button', {
    name: textMock('general.close'),
  });
  await user.click(closeButton);
  expect(
    screen.getByRole('button', { name: textMock(`ux_editor.component_properties.${propertyKey}`) }),
  ).toBeInTheDocument();
};
