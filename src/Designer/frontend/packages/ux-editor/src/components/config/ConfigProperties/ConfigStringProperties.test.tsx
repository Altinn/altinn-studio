import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigStringProperties, type ConfigStringPropertiesProps } from './ConfigStringProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen } from '@testing-library/react';
import {
  cancelConfigChanges,
  getPropertyByRole,
  openConfigAndVerify,
  saveConfigChanges,
} from './testConfigUtils';
import userEvent from '@testing-library/user-event';

const defaultProperty = 'someStringProperty';

describe('ConfigStringProperties', () => {
  it(`should render property text for the ${defaultProperty} property`, async () => {
    renderConfigStringProperties();
    expect(getPropertyByRole('button', defaultProperty)).toBeInTheDocument();
  });

  it('should not render anything when stringPropertyKeys is empty', () => {
    renderConfigStringProperties({ stringPropertyKeys: [] });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render EditStringValue components when keepEditOpen is true', () => {
    renderConfigStringProperties({
      stringPropertyKeys: [defaultProperty, 'displayMode'],
      keepEditOpen: true,
    });
    expect(screen.getAllByRole('textbox').length).toBe(2);
  });

  it('should call handleComponentUpdate when saving a new value', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    renderConfigStringProperties({ handleComponentUpdate });
    await openConfigAndVerify(defaultProperty);

    const textBox = getPropertyByRole('textbox', defaultProperty);
    await user.clear(textBox);
    await user.type(textBox, 'descending');
    await saveConfigChanges();

    expect(handleComponentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        someStringProperty: 'descending',
      }),
    );
  });

  it('should close the select editor when clicking cancel button', async () => {
    renderConfigStringProperties();
    await openConfigAndVerify(defaultProperty);
    expect(getPropertyByRole('textbox', defaultProperty)).toBeInTheDocument();
    await cancelConfigChanges();
    expect(getPropertyByRole('textbox', defaultProperty)).not.toBeInTheDocument();
  });
});

const renderConfigStringProperties = (props: Partial<ConfigStringPropertiesProps> = {}) => {
  const defaultProps: ConfigStringPropertiesProps = {
    schema: InputSchema,
    component: {
      ...componentMocks.Input,
      someStringProperty: '',
    },
    handleComponentUpdate: jest.fn(),
    stringPropertyKeys: [defaultProperty],
  };
  return renderWithProviders(<ConfigStringProperties {...defaultProps} {...props} />);
};
