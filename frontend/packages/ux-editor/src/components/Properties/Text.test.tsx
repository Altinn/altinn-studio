import React from 'react';
import { Text } from './Text';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { FormContext } from '../../containers/FormContext';
import {
    component1IdMock,
    component1Mock,
    container1IdMock,
    layoutMock,
} from '../../testing/layoutMock';
import type { IAppDataState } from '../../features/appData/appDataReducers';
import type { ITextResourcesState } from '../../features/appData/textResources/textResourcesSlice';
import {renderWithMockStore } from '../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../testing/stateMocks';
import { formContextProviderMock } from '../../testing/formContextMocks';
import {QueryKey} from "app-shared/types/QueryKey";
import {queryClientMock} from "app-shared/mocks/queryClientMock";
import {componentSchemaMocks} from "../../testing/componentSchemaMocks";
import type {ITextResource, ITextResources} from "app-shared/types/global";
import {DEFAULT_LANGUAGE} from "app-shared/constants";

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const labelTextId = 'labelTextId';
const addButtonTextId = 'customAddButtonTextId';
const labelTextValue = 'Label for group';
const addButtonTextValue = 'Custom text for add button for group';
const titleTextResource1: ITextResource = {
    id: labelTextId,
    value: labelTextValue,
};
const titleTextResource2: ITextResource = {
    id: addButtonTextId,
    value: addButtonTextValue,
};
const textResources: ITextResources = {
    [DEFAULT_LANGUAGE]: [titleTextResource1, titleTextResource2],
};

const textResourceBindingsPropertiesForComponentType = (componentType: string) => Object.keys(componentSchemaMocks[componentType].properties.textResourceBindings.properties);

describe('TextTab', () => {
    afterEach(jest.clearAllMocks);

    describe('when editing a container', () => {
        const props = {
            formId: container1IdMock,
            form: { ...layoutMock.containers[container1IdMock]},
        };

        it('should render the component', async () => {
            await render({ props });
            expect(
                screen.getByRole('heading', {name: textMock('general.text')}),
            ).toBeInTheDocument();
        });
        
        it('should render all available textResourceBinding properties for the group component',  async () => {
            await render({ props });
            (textResourceBindingsPropertiesForComponentType(props.form.type)).forEach(trbProperty => {
                // INVESTIGATE WHY IT DOES NOT WORK WITHOUT MOCKED TEXT
                const textResourcePropertyLabel = `[mockedText(ux_editor.modal_properties_textResourceBindings_${trbProperty})]`;
                expect(
                    screen.getByText(textMock(textResourcePropertyLabel)),
                ).toBeInTheDocument()
                const textResourcePropertyPlaceHolder = `[mockedText(ux_editor.modal_properties_textResourceBindings_${trbProperty}_add)]`;
                expect(
                    screen.getByText(textMock(textResourcePropertyPlaceHolder)),
                ).toBeInTheDocument()
            }
            );
        });

        it('should render already defined textResourceBinding properties for the group component when exist',  async () => {
            await render({ props: {...props, form: { ...layoutMock.containers[container1IdMock], textResourceBindings: { 'title': labelTextId, 'add_button': addButtonTextId} }}});
            expect(screen.getByText(labelTextValue)).toBeInTheDocument();
            expect(screen.getByText(addButtonTextValue)).toBeInTheDocument();
        });

        it('should render editable field in nb when a text is in editMode', async () => {
            await render({ props: {...props, form: { ...layoutMock.containers[container1IdMock], textResourceBindings: { 'title': labelTextId, 'add_button': addButtonTextId} }}, editId: labelTextId});

            expect(screen.getByText(textMock('ux_editor.edit_text_resource'))).toBeInTheDocument();
            const labelTextField = screen.getByRole('textbox', { name: textMock('language.nb') });
            expect(labelTextField).toBeInTheDocument();
        });
    });

    describe('when editing a component', () => {
        const props = {
            formId: component1IdMock,
            form: { ...component1Mock, dataModelBindings: {} },
        };

        it('should render the component', async () => {
            await render({ props });
            expect(
                screen.getByRole('heading', {name: textMock('general.text')}),
            ).toBeInTheDocument();
        });

        it('should render all available textResourceBinding properties for the input component',  async () => {
            await render({ props });
            (textResourceBindingsPropertiesForComponentType(props.form.type)).forEach(trbProperty => {
                    // INVESTIGATE WHY IT DOES NOT WORK WITHOUT MOCKED TEXT
                    const textResourcePropertyLabel = `[mockedText(ux_editor.modal_properties_textResourceBindings_${trbProperty})]`;
                    expect(
                        screen.getByText(textMock(textResourcePropertyLabel)),
                    ).toBeInTheDocument()
                    const textResourcePropertyPlaceHolder = `[mockedText(ux_editor.modal_properties_textResourceBindings_${trbProperty}_add)]`;
                    expect(
                        screen.getByText(textMock(textResourcePropertyPlaceHolder)),
                    ).toBeInTheDocument()
                }
            );
        });

        it('should render editable field in nb when a text is in editMode', async () => {
            await render({ props: {...props, form: { ...layoutMock.components[component1IdMock], textResourceBindings: { 'title': labelTextId, 'add_button': addButtonTextId} }}, editId: labelTextId});

            expect(screen.getByText(textMock('ux_editor.edit_text_resource'))).toBeInTheDocument();
            const labelTextField = screen.getByRole('textbox', { name: textMock('language.nb') });
            expect(labelTextField).toBeInTheDocument();
        });

        it('should auto-save when updating a field', async () => {
            await render({ props });

            const idInput = screen.getByLabelText(
                textMock('ux_editor.modal_properties_component_change_id'),
            );
            await act(() => user.type(idInput, 'test'));

            expect(formContextProviderMock.handleUpdate).toHaveBeenCalledTimes(4);
            expect(formContextProviderMock.debounceSave).toHaveBeenCalledTimes(4);
        });
    });
});

const render = async ({ props = {}, editId }: { props: Partial<FormContext>; editId?: string }) => {
    queryClientMock.setQueryData([QueryKey.FormComponent, props.form.type], componentSchemaMocks[props.form.type]);
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
        <FormContext.Provider
            value={{
                ...formContextProviderMock,
                ...props,
            }}
        >
            <Text />
        </FormContext.Provider>,
    );
};
