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
import type { IAppDataState } from '../../features/appData/appDataReducers';
import type { ITextResourcesState } from '../../features/appData/textResources/textResourcesSlice';
import { renderWithMockStore } from '../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../testing/stateMocks';
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
      await render({ props });
      expect(screen.getByRole('heading', { name: textMock('general.text') })).toBeInTheDocument();
    });

    it('should render all available textResourceBinding properties for the group component', async () => {
      await render({ props });
      textResourceBindingsPropertiesForComponentType(props.formItem.type).forEach((trbProperty) => {
        expect(
          screen.getByText(
            textMock(`ux_editor.modal_properties_textResourceBindings_${trbProperty}`),
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            textMock(`ux_editor.modal_properties_textResourceBindings_${trbProperty}_add`),
          ),
        ).toBeInTheDocument();
      });
    });

    it('should render already defined textResourceBinding properties for the group component when exist', async () => {
      await render({
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

    it('should render editable field in nb when a text is in editMode', async () => {
      await render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.containers[container1IdMock],
            textResourceBindings: { title: labelTextId, add_button: addButtonTextId },
          },
        },
        editId: labelTextId,
      });

      expect(screen.getByText(textMock('ux_editor.edit_text_resource'))).toBeInTheDocument();
      const labelTextField = screen.getByRole('textbox', { name: textMock('language.nb') });
      expect(labelTextField).toBeInTheDocument();
    });
  });

  describe('when editing a component', () => {
    const props = {
      formItemId: component1IdMock,
      formItem: { ...component1Mock, dataModelBindings: { simpleBinding: '' } },
    };

    it('should render the component', async () => {
      await render({ props });
      expect(screen.getByRole('heading', { name: textMock('general.text') })).toBeInTheDocument();
    });

    it('should render all available textResourceBinding properties for the input component', async () => {
      await render({ props });
      textResourceBindingsPropertiesForComponentType(props.formItem.type).forEach((trbProperty) => {
        expect(
          screen.getByText(
            textMock(`ux_editor.modal_properties_textResourceBindings_${trbProperty}`),
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            textMock(`ux_editor.modal_properties_textResourceBindings_${trbProperty}_add`),
          ),
        ).toBeInTheDocument();
      });
    });

    it('should render already defined textResourceBinding properties for the input component when exist', async () => {
      await render({
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

    it('should render editable field in nb when a text is in editMode', async () => {
      await render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components[component1IdMock],
            textResourceBindings: { title: labelTextId, description: descriptionTextId },
          },
        },
        editId: labelTextId,
      });

      expect(screen.getByText(textMock('ux_editor.edit_text_resource'))).toBeInTheDocument();
      const labelTextField = screen.getByRole('textbox', { name: textMock('language.nb') });
      expect(labelTextField).toBeInTheDocument();
    });

    it('should not render options section if component schema does not have options/optionsId property', async () => {
      await render({
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

    it('should render options section if component schema has options property', async () => {
      await render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components.ComponentWithOptionsMock,
            optionsId: 'optionsId',
          },
        },
      });

      expect(
        screen.getByRole('heading', {
          name: textMock('ux_editor.properties_panel.texts.options_title'),
        }),
      ).toBeInTheDocument();
    });

    it('should render options section with codelist view if component has optionId defined', async () => {
      await render({
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

    it('should render options section with manual view if component has options', async () => {
      await render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components.ComponentWithOptionsMock,
            options: [{ label: labelTextId, value: 'value' }],
          },
        },
      });

      expect(
        screen.getByText(textMock('ux_editor.properties_panel.options.add_options')),
      ).toBeInTheDocument();
    });
  });
});

const render = async ({
  props = {},
  editId,
}: {
  props: Partial<FormItemContext>;
  editId?: string;
}) => {
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, props.formItem.type],
    componentSchemaMocks[props.formItem.type],
  );
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);
  const textResourcesState: ITextResourcesState = {
    ...textResourcesMock,
    currentEditId: editId,
  };
  const appData: IAppDataState = {
    ...appDataMock,
    textResources: textResourcesState,
  };

  return renderWithMockStore({ appData })(
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
