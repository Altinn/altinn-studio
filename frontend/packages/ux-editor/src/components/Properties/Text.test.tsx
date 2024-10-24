import React from 'react';
import { Text } from './Text';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FormItemContext } from '../../containers/FormItemContext';
import {
  component1IdMock,
  component1Mock,
  container1IdMock,
  layoutMock,
} from '../../testing/layoutMock';
import { renderWithProviders } from '../../testing/mocks';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { componentSchemaMocks } from '../../testing/componentSchemaMocks';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';

jest.mock('../../testing/componentSchemaMocks', () => ({
  componentSchemaMocks: {
    ...jest.requireActual('../../testing/componentSchemaMocks').componentSchemaMocks,
    CustomComponentType: {},
  },
}));

// Test data:
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

    it('should render alert when schema does not have text property', async () => {
      render({
        props: {
          ...props,
          formItem: {
            type: 'CustomComponentType' as ComponentType,
          } as FormItem,
        },
      });
      const alert = screen.getByText(textMock('ux_editor.properties_panel.texts.no_properties'));
      expect(alert).toBeInTheDocument();
    });

    it('should render sub title for texts', () => {
      render({ props });
      const textsSubTitle = screen.getByText(
        textMock('ux_editor.properties_panel.texts.sub_title_texts'),
      );
      expect(textsSubTitle).toBeInTheDocument();
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

    it('should render options section if component schema has options property', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components.ComponentWithOptionsMock,
            optionsId: undefined,
            options: [{ label: labelTextId, value: 'value' }],
          },
        },
      });

      expect(screen.getByText(textMock('ux_editor.options.section_heading'))).toBeInTheDocument();
    });

    it('should render options section if component schema has optionsId property', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...layoutMock.components.ComponentWithOptionsMock,
            optionsId: 'optionsId',
            options: undefined,
          },
        },
      });

      expect(screen.getByText(textMock('ux_editor.options.section_heading'))).toBeInTheDocument();
    });

    it('should NOT render options section if component schema has neither options nor optionsId property', () => {
      render({
        props: {
          ...props,
          formItem: {
            id: 'ComponentWithoutOptionsMock',
            type: ComponentType.Input,
            itemType: 'COMPONENT',
            propertyPath: 'definitions/inputComponent',
            dataModelBindings: { simpleBinding: 'some-path' },
          },
        },
      });

      expect(
        screen.queryByText(textMock('ux_editor.options.section_heading')),
      ).not.toBeInTheDocument();
    });

    it('should render image section if component is image', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...componentMocks[ComponentType.Image],
          },
        },
      });
      const addImageTabTitle = screen.getByRole('tab', {
        name: textMock('ux_editor.properties_panel.images.add_image_tab_title'),
      });
      const pasteUrlTabTitle = screen.getByRole('tab', {
        name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
      });
      expect(addImageTabTitle).toBeInTheDocument();
      expect(pasteUrlTabTitle).toBeInTheDocument();
    });

    it('should render sub title for images options when component is image', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...componentMocks[ComponentType.Image],
          },
        },
      });
      const imagesSubTitle = screen.getByText(
        textMock('ux_editor.properties_panel.texts.sub_title_images'),
      );
      expect(imagesSubTitle).toBeInTheDocument();
    });

    it('should call handleUpdate when handleComponentChange is triggered from EditTextResourceBindings', async () => {
      const user = userEvent.setup();
      const newText = 'newText';
      render({ props });
      const addTitleText = screen.getByRole('button', {
        name: textMock('ux_editor.modal_properties_textResourceBindings_title'),
      });
      await user.click(addTitleText);
      const enterTextField = screen.getByRole('textbox', {
        name: textMock('ux_editor.text_resource_binding_text'),
      });
      await user.type(enterTextField, newText);
      await waitFor(() => enterTextField.blur());
      await waitFor(() => {
        expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalled();
      });
    });

    it('should call handleUpdate when handleComponentChange is triggered from EditOptions', async () => {
      const user = userEvent.setup();
      const newOptionsRef = 'newOptionsRef';
      render({
        props: {
          ...props,
          formItem: {
            ...componentMocks[ComponentType.Checkboxes],
          },
        },
      });
      const addReferenceTab = await screen.findByRole('tab', {
        name: textMock('ux_editor.options.tab_referenceId'),
      });
      await waitFor(() => user.click(addReferenceTab));
      const enterReferenceField = screen.getByRole('textbox', {
        name: textMock('ux_editor.modal_properties_custom_code_list_id'),
      });
      await user.type(enterReferenceField, newOptionsRef);
      await waitFor(() => enterReferenceField.blur());
      await waitFor(() => {
        expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalled();
      });
    });

    it('should call handleUpdate when handleComponentChange is triggered from EditImage', async () => {
      const user = userEvent.setup();
      const newUrl = 'newUrl';
      render({
        props: {
          ...props,
          formItem: {
            ...componentMocks[ComponentType.Image],
          },
        },
      });
      const pasteUrlTab = screen.getByRole('tab', {
        name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
      });
      await user.click(pasteUrlTab);
      const enterUrlField = screen.getByRole('textbox', {
        name: textMock('ux_editor.properties_panel.images.enter_external_url'),
      });
      await user.type(enterUrlField, newUrl);
      await waitFor(() => enterUrlField.blur());
      await waitFor(() => {
        expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalled();
      });
    });

    it('should render subform tabel section if component is subform', () => {
      render({
        props: {
          ...props,
          formItem: {
            ...componentMocks[ComponentType.SubForm],
          },
        },
      });
      const tabelHeading = screen.getByRole('heading', {
        name: textMock('ux_editor.properties_panel.subform_table_columns.heading'),
        level: 2,
      });
      expect(tabelHeading).toBeInTheDocument();
    });
  });
});

const render = ({ props = {} }: { props: Partial<FormItemContext> }) => {
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, props.formItem.type],
    componentSchemaMocks[props.formItem.type],
  );
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);

  return renderWithProviders(
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
