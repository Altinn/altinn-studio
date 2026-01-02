import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { ConfigStringProperties, type ConfigStringPropertiesProps } from './ConfigStringProperties';
import { componentMocks } from '../../../testing/componentMocks';
import InputSchema from '../../../testing/schemas/json/component/Input.schema.v1.json';
import { screen } from '@testing-library/react';
import { getPropertyByRole } from './testConfigUtils';

describe('ConfigStringProperties', () => {
  it('should render property text for the "sortOrder" property', async () => {
    renderConfigStringProperties({ props: { stringPropertyKeys: ['sortOrder'] } });
    expect(getPropertyByRole('button', 'sortOrder')).toBeInTheDocument();
  });

  it('should not render anything when stringPropertyKeys is empty', () => {
    renderConfigStringProperties({});
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render EditStringValue components when keepEditOpen is true', () => {
    renderConfigStringProperties({
      props: {
        stringPropertyKeys: ['sortOrder', 'displayMode'],
        keepEditOpen: true,
      },
    });
    expect(screen.getAllByRole('textbox').length).toBe(2);
  });
});

const renderConfigStringProperties = ({
  props = {},
}: {
  props?: Partial<ConfigStringPropertiesProps>;
}) => {
  const { Input: inputComponent } = componentMocks;
  const defaultProps: ConfigStringPropertiesProps = {
    schema: InputSchema,
    component: inputComponent,
    handleComponentUpdate: jest.fn(),
    stringPropertyKeys: [],
  };
  return renderWithProviders(<ConfigStringProperties {...defaultProps} {...props} />);
};
