import React from 'react';
import { screen } from '@testing-library/react';
import { EditOptions } from './EditOptions';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../types/FormItem';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { componentMocks } from '../../../../testing/componentMocks';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const queryClientMock = createQueryClientMock();

describe('EditOptions', () => {
  afterEach(() => queryClientMock.clear());

  it('should render', () => {
    renderEditOptions();
    expect(screen.getByText(textMock('ux_editor.options.section_heading'))).toBeInTheDocument();
  });

  it('should render spinner when loading data', () => {
    renderEditOptions();
    expect(screen.getByText(textMock('ux_editor.modal_properties_loading'))).toBeInTheDocument();
  });

  it('should render child component when loading is done', async () => {
    renderEditOptions({
      componentProps: { options: undefined, optionsId: undefined },
    });
    expect(
      await screen.findByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
      }),
    ).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', async () => {
    renderEditOptions({
      componentProps: { options: undefined, optionsId: undefined },
    });

    expect(
      await screen.findByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should show manual options view when options property is set', async () => {
    renderEditOptions({
      componentProps: {
        options: [
          { label: 'label1', value: 'value1' },
          { label: 'label2', value: 'value2' },
        ],
      },
    });

    expect(
      await screen.findByRole('tab', {
        name: textMock('ux_editor.options.tab_manual'),
        selected: true,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('value1')).toBeInTheDocument();
    expect(screen.getByText('value2')).toBeInTheDocument();
    expect(screen.getByText(textMock('ux_editor.modal_new_option'))).toBeInTheDocument();
  });

  it('should show manual options view when options property is empty list', async () => {
    renderEditOptions({
      componentProps: { options: [] },
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
      },
    });
    expect(await screen.findByText(textMock('ux_editor.modal_new_option'))).toBeInTheDocument();
  });

  it('should show code list tab when component has optionsId defined matching an optionId in optionsID-list', async () => {
    const optionsId = 'optionsId';
    renderEditOptions({
      componentProps: {
        optionsId,
      },
      queries: {
        getOptionListIds: jest
          .fn()
          .mockImplementation(() => Promise.resolve<string[]>([optionsId])),
      },
    });

    expect(
      await screen.findByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should switch to manual input clicking manual tab', async () => {
    const user = userEvent.setup();
    renderEditOptions({
      componentProps: { optionsId: '' },
    });

    expect(
      screen.queryByRole('tab', {
        name: textMock('ux_editor.options.tab_manual'),
        selected: true,
      }),
    ).not.toBeInTheDocument();

    const manualTabElement = await screen.findByRole('tab', {
      name: textMock('ux_editor.options.tab_manual'),
    });
    await waitFor(() => user.click(manualTabElement));

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_manual'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should switch to codelist input clicking codelist tab', async () => {
    const user = userEvent.setup();
    renderEditOptions({
      componentProps: { options: [] },
    });

    expect(
      screen.queryByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
        selected: true,
      }),
    ).not.toBeInTheDocument();

    const codelistTabElement = await screen.findByRole('tab', {
      name: textMock('ux_editor.options.tab_code_list'),
    });
    await waitFor(() => user.click(codelistTabElement));

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should switch to referenceId input clicking referenceId tab', async () => {
    const user = userEvent.setup();
    renderEditOptions({
      componentProps: { options: [] },
    });

    expect(
      screen.queryByRole('tab', {
        name: textMock('ux_editor.options.tab_referenceId'),
        selected: true,
      }),
    ).not.toBeInTheDocument();

    const referenceIdElement = await screen.findByRole('tab', {
      name: textMock('ux_editor.options.tab_referenceId'),
    });
    await waitFor(() => user.click(referenceIdElement));

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_referenceId'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should show alert message in Manual tab when prop areLayoutOptionsSupported is false', async () => {
    const user = userEvent.setup();
    renderEditOptions({
      componentProps: { optionsId: '' },
      renderOptions: { areLayoutOptionsSupported: false },
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
      },
    });

    const manualTabElement = await screen.findByRole('tab', {
      name: textMock('ux_editor.options.tab_manual'),
    });

    await waitFor(() => user.click(manualTabElement));
    expect(screen.getByText(textMock('ux_editor.options.code_list_only'))).toBeInTheDocument();
  });

  it('should show error message if getOptionListIds fails', async () => {
    renderEditOptions({
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.reject()),
      },
    });

    expect(
      await screen.findByText(
        textMock('ux_editor.modal_properties_fetch_option_list_ids_error_message'),
      ),
    ).toBeInTheDocument();
    jest.clearAllMocks();
  });
});

function renderEditOptions<T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps,
  handleComponentChange = jest.fn(),
  queries = {},
}: {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
} = {}) {
  return renderWithProviders(
    <EditOptions
      handleComponentChange={handleComponentChange}
      component={{
        ...mockComponent,
        ...componentProps,
      }}
    />,
    {
      queries,
      queryClient: queryClientMock,
    },
  );
}
