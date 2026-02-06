import React from 'react';
import { ConfigGridProperties, type ConfigGridPropertiesProps } from './ConfigGridProperties';
import { componentMocks } from '../../../testing/componentMocks';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { getPropertyByRole } from './testConfigUtils';

describe('ConfigGridProperties', () => {
  it('should toggle close button and grid with text when the open and close buttons are clicked', async () => {
    const user = userEvent.setup();
    renderConfigGridProperties();
    const openGridButton = getPropertyByRole('button', 'grid');
    await user.click(openGridButton);
    expect(screen.getByText(textMock('ux_editor.component_properties.grid'))).toBeInTheDocument();
    const widthText = screen.getByText(textMock('ux_editor.modal_properties_grid'));
    expect(widthText).toBeInTheDocument();
    await closeCard('grid');
    expect(widthText).not.toBeInTheDocument();
  });

  type RenderConfigGridPropertiesProps = {
    props?: Partial<ConfigGridPropertiesProps>;
  };

  const renderConfigGridProperties = ({ props }: RenderConfigGridPropertiesProps = {}) => {
    const defaultProps: ConfigGridPropertiesProps = {
      component: componentMocks.Input,
      handleComponentUpdate: jest.fn(),
    };
    return render(<ConfigGridProperties {...defaultProps} {...props} />);
  };
});

const closeCard = async (propertyKey: string) => {
  const user = userEvent.setup();
  const closeButton = await screen.findByRole('button', {
    name: textMock('general.close'),
  });
  await user.click(closeButton);
  expect(getPropertyByRole('button', propertyKey)).toBeInTheDocument();
};
