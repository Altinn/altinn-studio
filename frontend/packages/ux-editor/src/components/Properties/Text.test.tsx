import React from 'react';
import { Text } from './Text';
import { screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { FormItemContext } from '../../containers/FormItemContext';
import {
  component1IdMock,
  component1Mock,
  container1IdMock,
  layoutMock,
} from '../../testing/layoutMock';
import { renderWithMockStore } from '../../testing/mocks';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { componentSchemaMocks } from '../../testing/componentSchemaMocks';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

// Test data:
const org = 'org';
const app = 'app';
const labelTextId = 'labelTextId';
const descriptionTextId = 'descriptionTextId';
const addButtonTextId = 'customAddButtonTextId';
const labelTextValue = 'Label for component';
const descriptionTextValue = 'Description for component';
const addButtonTextValue = 'Custom text for add button for group';
const titleTextResource1: ITextResource = {
  id: labelTextId,
  value: labelTextValue,
};
const titleTextResource2: ITextResource = {
  id: addButtonTextId,
  value: addButtonTextValue,
};
const titleTextResource3: ITextResource = {
  id: descriptionTextId,
  value: descriptionTextValue,
};
const textResources: ITextResources = {
  [DEFAULT_LANGUAGE]: [titleTextResource1, titleTextResource2, titleTextResource3],
};

const textResourceBindingsPropertiesForComponentType = (componentType: string) =>
  Object.keys(componentSchemaMocks[componentType].properties.textResourceBindings.properties);

describe('TextTab', () => {
  afterEach(jest.clearAllMocks);

  describe('when editing a container', () => {
    const props = {
      formItemId: container1IdMock,
      formItem: { ...layoutMock.containers[container1IdMock] },
    };

    it('should render the component', async () => {
      render({ props });
    });

    it('should render all available textResourceBinding properties for the group component', () => {
      render({ props });
      textResourceBindingsPropertiesForComponentType(props.formItem.type).forEach((trbProperty) => {
        screen.getByRole('button', {
          name: textMock(`ux_editor.modal_properties_textResourceBindings_${trbProperty}`),
        });
      });
    });

    it('should render already defined textResourceBinding properties for the group component when exist', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.containers[container1IdMock],
            textResourceBindings: { title: labelTextId, summaryTitle: addButtonTextId },
          },
        },
      });
      expect(screen.getByText(labelTextValue)).toBeInTheDocument();
      expect(screen.getByText(addButtonTextValue)).toBeInTheDocument();
    });
  });

  describe('when editing a component', () => {
    const props = {
      formItemId: component1IdMock,
      formItem: { ...component1Mock },
    };

    it('should render the component', () => {
      render({ props });
    });

    it('should render all available textResourceBinding properties for the input component', () => {
      render({ props });
      textResourceBindingsPropertiesForComponentType(props.formItem.type).forEach((trbProperty) => {
        screen.getByRole('button', {
          name: textMock(`ux_editor.modal_properties_textResourceBindings_${trbProperty}`),
        });
      });
    });

    it('should render already defined textResourceBinding properties for the input component when exist', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components[component1IdMock],
            textResourceBindings: { title: labelTextId, description: descriptionTextId },
          },
        },
      });
      expect(screen.getByText(labelTextValue)).toBeInTheDocument();
      expect(screen.getByText(descriptionTextValue)).toBeInTheDocument();
    });

    it('should not render options section if component schema does not have options/optionsId property', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components[component1IdMock],
          },
        },
      });

      expect(
        screen.queryByRole('heading', {
          name: textMock('ux_editor.properties_panel.texts.options_title'),
        }),
      ).not.toBeInTheDocument();
    });

    it('should render options section if component schema has options property', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components.ComponentWithOptionsMock,
            optionsId: 'optionsId',
          },
        },
      });
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.properties_panel.options.use_code_list_label'),
      });
    });

    it('should render options section with codelist view if component has optionId defined', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components.ComponentWithOptionsMock,
            optionsId: 'optionsId',
          },
        },
      });

      expect(
        screen.getByText(textMock('ux_editor.modal_properties_custom_code_list_id')),
      ).toBeInTheDocument();
    });

    it('should render options section with manual view if component has options', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components.ComponentWithOptionsMock,
            options: [{ label: labelTextId, value: 'value' }],
          },
        },
      });
      screen.getByRole('button', { name: textMock('ux_editor.modal_new_option') });
    });
  });
});

const render = ({ props = {}, editId }: { props: Partial<FormItemContext>; editId?: string }) => {
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, props.formItem.type],
    componentSchemaMocks[props.formItem.type],
  );
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);

  return renderWithMockStore()(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...props,
      }}
    >
      <Text />
    </FormItemContext.Provider>,
  );
};
