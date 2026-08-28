import { renderWithProviders } from '../../../testing/mocks';
import { ConfigNumberProperties, type ConfigNumberPropertiesProps } from './ConfigNumberProperties';
import { componentMocks } from '../../../testing/componentMocks';
import type { PropertyDefinition } from '@app/layout-contract';
import userEvent from '@testing-library/user-event';
import {
  cancelConfigAndVerify,
  getPropertyByRole,
  openConfigAndVerify,
  saveConfigChanges,
} from './testConfigUtils';

const defaultProperty = 'someNumberProperty';
const properties: Record<string, PropertyDefinition> = {
  [defaultProperty]: { type: 'number', allowedValues: [1, 2, 3], required: false },
  preselectedOptionIndex: { type: 'number', required: false },
};

describe('ConfigNumberProperties', () => {
  it('should render property text for "preselectedOptionIndex" with button suffix', () => {
    renderConfigNumberProperties({
      numberPropertyKeys: ['preselectedOptionIndex'],
    });
    expect(getPropertyByRole('button', 'preselectedOptionIndex_button')).toBeInTheDocument();
  });

  it('should render EditNumberValue components when keepEditOpen is true', () => {
    renderConfigNumberProperties({
      keepEditOpen: true,
    });
    expect(getPropertyByRole('combobox', defaultProperty)).toBeInTheDocument();
  });

  it('should be able to toggle number property config', async () => {
    const user = userEvent.setup();
    renderConfigNumberProperties();
    await openConfigAndVerify({ user, property: defaultProperty });
    await cancelConfigAndVerify(user);
  });

  it('should call handleComponentUpdate when saving a new value', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    renderConfigNumberProperties({
      handleComponentUpdate,
      properties: {
        ...properties,
        someNumberProperty: { type: 'number', required: false },
      },
    });

    await openConfigAndVerify({ user, property: defaultProperty });
    const textBox = getPropertyByRole('textbox', defaultProperty);
    await user.type(textBox, '2');
    await saveConfigChanges(user);

    expect(handleComponentUpdate).toHaveBeenCalledWith({
      ...componentMocks.Input,
      someNumberProperty: 2,
    });
  });

  const defaultProps: ConfigNumberPropertiesProps = {
    numberPropertyKeys: [defaultProperty],
    properties,
    component: componentMocks.Input,
    handleComponentUpdate: jest.fn(),
  };
  const renderConfigNumberProperties = (props: Partial<ConfigNumberPropertiesProps> = {}) => {
    return renderWithProviders(<ConfigNumberProperties {...defaultProps} {...props} />, {});
  };
});
