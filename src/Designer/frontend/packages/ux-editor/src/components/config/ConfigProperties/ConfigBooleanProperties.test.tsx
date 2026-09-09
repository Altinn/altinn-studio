import { renderWithProviders } from '../../../testing/mocks';
import {
  ConfigBooleanProperties,
  type ConfigBooleanPropertiesProps,
} from './ConfigBooleanProperties';
import { componentMocks } from '../../../testing/componentMocks';
import { componentCatalog } from '@app/layout-contract';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { getPropertyByRole } from './testConfigUtils';

describe('ConfigBooleanProperties', () => {
  it('should render expected default boolean components', async () => {
    renderConfigBooleanProperties({
      props: {
        booleanPropertyKeys: ['readOnly', 'required', 'hidden'],
      },
    });
    const properties = ['readOnly', 'required', 'hidden'];
    for (const property of properties) {
      expect(getPropertyByRole('switch', property)).toBeInTheDocument();
    }
  });

  it('should render the hide-button after clicking on show-button', async () => {
    const user = userEvent.setup();
    renderConfigBooleanProperties({});
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_other_properties_hide_many_settings'),
      }),
    ).toBeInTheDocument();
  });

  it('should render additional boolean properties when show-button is clicked', async () => {
    const user = userEvent.setup();
    renderConfigBooleanProperties({});
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
    await user.click(button);
    const properties = [
      'renderAsSummary',
      'variant',
      'autocomplete',
      'maxLength',
      'pageBreak',
      'formatting',
    ];
    for (const property of properties) {
      expect(getPropertyByRole('switch', property)).toBeInTheDocument();
    }
  });

  it('should render default boolean values if defined', async () => {
    const user = userEvent.setup();
    renderConfigBooleanProperties({
      props: {
        booleanPropertyKeys: ['readOnly', 'required', 'hidden', 'timeStamp'],
        properties: componentCatalog.Datepicker.properties,
      },
    });
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(getPropertyByRole('switch', 'timeStamp')).not.toBeChecked();
  });

  it('should call handleComponentUpdate when a boolean value is toggled', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderConfigBooleanProperties({
      props: {
        booleanPropertyKeys: ['readOnly', 'required', 'hidden'],
        properties: componentCatalog.Datepicker.properties,
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    await user.click(getPropertyByRole('switch', 'readOnly'));
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ readOnly: true }),
    );
  });

  const booleanPropertiesKeys = [
    'readOnly',
    'required',
    'hidden',
    'renderAsSummary',
    'variant',
    'autocomplete',
    'maxLength',
    'pageBreak',
    'formatting',
  ];
  const renderConfigBooleanProperties = ({
    props = {},
    queries = {},
  }: {
    props?: Partial<ConfigBooleanPropertiesProps>;
    queries?: Partial<ServicesContextProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: ConfigBooleanPropertiesProps = {
      booleanPropertyKeys: booleanPropertiesKeys,
      properties: componentCatalog.Input.properties,
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
    };
    return renderWithProviders(<ConfigBooleanProperties {...defaultProps} {...props} />, {
      queries,
    });
  };
});
