import React from 'react';
import { screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { ReferenceTab } from './ReferenceTab';
import { renderWithProviders } from '../../../../../../testing/mocks';
import type { ExtendedRenderOptions } from '../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent, SelectionComponentType } from '../../../../../../types/FormComponent';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '../../../../../../testing/componentMocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const mockComponent = componentMocks[ComponentType.Dropdown];
const mockOptionsId1 = 'test1';
const mockOptionsId2 = 'test2';
const optionListIds: string[] = [mockOptionsId1, mockOptionsId2];
const handleComponentChange = jest.fn();
const org = 'org';
const app = 'app';

describe('ReferenceTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render a spinner', () => {
    renderReferenceTab();
    expect(screen.getByText(textMock('ux_editor.modal_properties_loading'))).toBeInTheDocument();
  });

  it('should render the component', () => {
    renderReferenceTabWithData();

    expect(
      screen.getByText(textMock('ux_editor.options.code_list_reference_id.description')),
    ).toBeInTheDocument();
  });

  it('should render value when optionsId is set', () => {
    renderReferenceTabWithData({
      componentProps: {
        optionsId: 'some-id',
      },
    });

    expect(getInputElement()).toHaveValue('some-id');
  });

  it('should render no value if optionsId is a codeList from the library', () => {
    renderReferenceTabWithData({
      componentProps: {
        optionsId: mockOptionsId1,
      },
    });

    expect(getInputElement()).toHaveValue('');
  });

  it('should call handleComponentChange with updated component when input value changes', async () => {
    const user = userEvent.setup();
    renderReferenceTabWithData();
    const inputElement = getInputElement();
    await user.type(inputElement, 'a');
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      optionsId: 'a',
    });
  });

  it('should call handleComponentChange without the options property (if it exists) when input value changes', async () => {
    const user = userEvent.setup();
    renderReferenceTabWithData({
      componentProps: {
        options: [
          {
            value: 'value',
            label: 'text',
          },
        ],
      },
    });
    const inputElement = getInputElement();
    await user.type(inputElement, 'a');
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      optionsId: 'a',
    });
  });

  it('Updates the ID when the component is rerendered with another ID', () => {
    const initialComponentProps: FormComponent<SelectionComponentType> = {
      ...mockComponent,
      optionsId: 'some-id',
    };
    const { rerender } = renderReferenceTabWithData({ componentProps: initialComponentProps });
    const changedOptionsId = 'another-id';
    const changedComponentProps: FormComponent<SelectionComponentType> = {
      ...initialComponentProps,
      optionsId: changedOptionsId,
    };
    rerender(
      <ReferenceTab
        handleComponentChange={handleComponentChange}
        component={changedComponentProps}
      />,
    );
    expect(getInputElement()).toHaveValue(changedOptionsId);
  });
});

function getInputElement() {
  return screen.getByRole('textbox', {
    name: textMock('ux_editor.modal_properties_custom_code_list_id'),
  });
}

type RenderReferenceTabWithDataProps = Pick<RenderReferenceTabProps, 'componentProps'>;

function renderReferenceTabWithData({
  componentProps,
}: RenderReferenceTabWithDataProps = {}): RenderResult {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OptionListIds, org, app], optionListIds);
  return renderReferenceTab({ componentProps, options: { queryClient } });
}

type RenderReferenceTabProps = {
  componentProps?: Partial<
    FormComponent<ComponentType.RadioButtons | ComponentType.Checkboxes | ComponentType.Dropdown>
  >;
  options?: ExtendedRenderOptions;
};

const renderReferenceTab = ({
  componentProps = {},
  options,
}: RenderReferenceTabProps = {}): RenderResult =>
  renderWithProviders(
    <ReferenceTab
      handleComponentChange={handleComponentChange}
      component={{
        ...mockComponent,
        ...componentProps,
      }}
    />,
    {
      appRouteParams: { org, app },
      ...options,
    },
  );
