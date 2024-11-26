import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../types/FormItem';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../testing/mocks';
import { OptionTabs } from './OptionTabs';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
} from 'app-shared/utils/featureToggleUtils';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];

describe('EditOptions', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render component', () => {
    renderEditOptions();
    expect(screen.getByText(textMock('ux_editor.options.tab_code_list'))).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', () => {
    renderEditOptions({
      componentProps: { options: undefined, optionsId: undefined },
    });
    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should show code list tab when component has optionsId defined matching an optionId in optionsID-list', () => {
    const optionsId = 'optionsId';
    renderEditOptions({
      componentProps: {
        optionsId,
        options: undefined,
      },
      optionListIds: [optionsId],
    });

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
      }),
    ).toBeInTheDocument();
  });

  it('should show referenceId tab when component has optionsId defined not matching an optionId in optionsId-list', () => {
    const optionsId = 'optionsId';
    renderEditOptions({
      componentProps: {
        optionsId,
        options: undefined,
      },
      optionListIds: [],
    });

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_referenceId'),
      }),
    ).toBeInTheDocument();
  });

  it('should switch to code list tab when clicking code list tab', async () => {
    const user = userEvent.setup();
    const optionsId = 'optionsId';
    renderEditOptions({
      componentProps: {
        optionsId,
      },
      optionListIds: [],
    });

    expect(
      screen.queryByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
        selected: true,
      }),
    ).not.toBeInTheDocument();

    const codeListTabElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_code_list'),
    });
    await user.click(codeListTabElement);

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
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

    const referenceIdElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_referenceId'),
    });
    await user.click(referenceIdElement);
    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_referenceId'),
        selected: true,
      }),
    ).toBeInTheDocument();
  });

  it('should show alert message in CodeList tab when prop isOnlyOptionsIdSupported is false', async () => {
    addFeatureFlagToLocalStorage('optionListEditor');
    const user = userEvent.setup();
    renderEditOptions({
      componentProps: { options: undefined, optionsId: undefined },
      renderOptions: { isOnlyOptionsIdSupported: false },
    });

    const codeListTabElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_code_list'),
    });
    await user.click(codeListTabElement);

    expect(screen.getByText(textMock('ux_editor.options.code_list_only'))).toBeInTheDocument();
  });

  it('should render EditOptionChoice when featureFlag is enabled', async () => {
    addFeatureFlagToLocalStorage('optionListEditor');
    const optionsId = 'optionsId';
    renderEditOptions({
      componentProps: {
        optionsId,
        options: undefined,
      },
      optionListIds: [optionsId],
      renderOptions: { isOnlyOptionsIdSupported: true },
    });

    expect(
      await screen.findByRole('button', { name: textMock('ux_editor.options.option_remove_text') }),
    ).toBeInTheDocument();
  });

  // Todo: Remove once featureFlag "optionListEditor" is removed
  it('should show alert message in CodeList tab when prop areLayoutOptionsSupported is false', async () => {
    removeFeatureFlagFromLocalStorage('optionListEditor');
    const user = userEvent.setup();
    renderEditOptions({
      componentProps: { options: undefined, optionsId: undefined },
      renderOptions: { isOnlyOptionsIdSupported: false },
    });

    const manualTabElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_manual'),
    });
    await user.click(manualTabElement);

    expect(screen.getByText(textMock('ux_editor.options.code_list_only'))).toBeInTheDocument();
  });
});

type renderEditOptionsProps<T extends ComponentType.Checkboxes | ComponentType.RadioButtons> = {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
  renderOptions?: {
    isOnlyOptionsIdSupported?: boolean;
  };
  optionListIds?: string[];
};

function renderEditOptions<T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps = {},
  handleComponentChange = jest.fn(),
  queries = {},
  renderOptions = {},
  optionListIds = [],
}: renderEditOptionsProps<T> = {}) {
  return renderWithProviders(
    <OptionTabs
      optionListIds={optionListIds}
      handleComponentChange={handleComponentChange}
      component={{
        ...mockComponent,
        ...componentProps,
      }}
      renderOptions={renderOptions}
    />,
    {
      queries,
      queryClient: createQueryClientMock(),
    },
  );
}
