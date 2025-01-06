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
import { componentMocks } from '../../../../../testing/componentMocks';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';

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
        name: textMock('ux_editor.options.tab_reference_id'),
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

    const referenceIdElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_reference_id'),
    });
    await user.click(referenceIdElement);

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_reference_id'),
      }),
    ).toBeInTheDocument();
  });

  it('should render EditOptionChoice when featureFlag is enabled', async () => {
    addFeatureFlagToLocalStorage(FeatureFlag.OptionListEditor);
    const optionsId = 'optionsId';
    renderEditOptions({
      componentProps: {
        optionsId,
        options: undefined,
      },
      optionListIds: [optionsId],
    });

    expect(
      await screen.findByRole('button', { name: textMock('ux_editor.options.option_remove_text') }),
    ).toBeInTheDocument();
  });

  it('should switch to referenceId input clicking referenceId tab', async () => {
    addFeatureFlagToLocalStorage(FeatureFlag.OptionListEditor);
    const user = userEvent.setup();
    renderEditOptions({
      componentProps: { options: [] },
    });

    const referenceIdElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_reference_id'),
    });
    await user.click(referenceIdElement);

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_reference_id'),
      }),
    ).toBeInTheDocument();
  });
});

type renderEditOptionsProps<T extends ComponentType.Checkboxes | ComponentType.RadioButtons> = {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
  optionListIds?: string[];
};

function renderEditOptions<T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps = {},
  handleComponentChange = jest.fn(),
  queries = {},
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
    />,
    {
      queries,
      queryClient: createQueryClientMock(),
    },
  );
}
