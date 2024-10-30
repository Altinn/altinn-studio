import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditOptions } from './EditOptions';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../types/FormComponent';
import type { FormItem } from '../../../../types/FormItem';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';

const mockComponent: FormComponent<ComponentType.RadioButtons> = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: 'ServiceName',
  },
  maxLength: 10,
  itemType: 'COMPONENT',
  dataModelBindings: { simpleBinding: '' },
};

const queryClientMock = createQueryClientMock();

const renderEditOptions = async <T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps,
  handleComponentChange = jest.fn(),
  queries = {},
  renderOptions = {},
}: {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
  renderOptions?: {
    onlyCodeListOptions?: boolean;
  };
} = {}) => {
  const component = {
    ...mockComponent,
    ...componentProps,
  };
  renderWithProviders(
    <EditOptions
      handleComponentChange={handleComponentChange}
      component={component}
      renderOptions={renderOptions}
    />,
    {
      queries,
      queryClient: queryClientMock,
    },
  );
};

describe('EditOptions', () => {
  afterEach(() => {
    queryClientMock.clear();
  });
  it('should render', async () => {
    await renderEditOptions();
    expect(screen.getByText(textMock('ux_editor.options.section_heading'))).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', async () => {
    await renderEditOptions({
      componentProps: { options: undefined, optionsId: undefined },
    });
    expect(
      await screen.findByRole('tab', {
        name: textMock('ux_editor.options.tab_codelist'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should show manual options view when options property is set', async () => {
    await renderEditOptions({
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
    await renderEditOptions({
      componentProps: { options: [] },
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
      },
    });
    expect(await screen.findByText(textMock('ux_editor.modal_new_option'))).toBeInTheDocument();
  });

  it('should show code list tab when component has optionsId defined matching an optionId in optionsID-list', async () => {
    const optionsId = 'optionsId';
    await renderEditOptions({
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
        name: textMock('ux_editor.options.tab_codelist'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should switch to manual input clicking manual tab', async () => {
    const user = userEvent.setup();
    await renderEditOptions({
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
    await renderEditOptions({
      componentProps: { options: [] },
    });

    expect(
      screen.queryByRole('tab', {
        name: textMock('ux_editor.options.tab_codelist'),
        selected: true,
      }),
    ).not.toBeInTheDocument();

    const codelistTabElement = await screen.findByRole('tab', {
      name: textMock('ux_editor.options.tab_codelist'),
    });
    await waitFor(() => user.click(codelistTabElement));
    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_codelist'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should switch to referenceId input clicking referenceId tab', async () => {
    const user = userEvent.setup();
    await renderEditOptions({
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

  it('should show alert message in Manual tab when prop onlyCodeListOptions is true', async () => {
    const user = userEvent.setup();
    await renderEditOptions({
      componentProps: { optionsId: '' },
      renderOptions: { onlyCodeListOptions: true },
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
      },
    });

    const manualTabElement = await screen.findByRole('tab', {
      name: textMock('ux_editor.options.tab_manual'),
    });

    await waitFor(() => user.click(manualTabElement));
    expect(screen.getByText(textMock('ux_editor.options.codelist_only'))).toBeInTheDocument();
  });

  it('should show error message if query fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderEditOptions({
      queries: {
        getOptionListIds: jest.fn().mockRejectedValueOnce(new Error('Error')),
      },
    });

    expect(await screen.findByText('Error')).toBeInTheDocument();
    jest.clearAllMocks();
  });
});
