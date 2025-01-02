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

describe('OptionTabs', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render component', () => {
    renderOptionTabs();
    expect(screen.getByText(textMock('ux_editor.options.tab_code_list'))).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', () => {
    renderOptionTabs({
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
    renderOptionTabs({
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
    renderOptionTabs({
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
    renderOptionTabs({
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
    renderOptionTabs({
      componentProps: { options: [] },
    });

    const referenceIdElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_referenceId'),
    });
    await user.click(referenceIdElement);

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_referenceId'),
      }),
    ).toBeInTheDocument();
  });

  it('should render ManualOptionsEditor when manual options are set and featureFlag is enabled', async () => {
    addFeatureFlagToLocalStorage(FeatureFlag.OptionListEditor);
    const options = [{ value: '1', label: 'label 1' }];
    renderOptionTabs({
      componentProps: {
        optionsId: undefined,
        options,
      },
    });

    expect(await screen.findByText(options[0].label)).toBeInTheDocument();
  });

  it('should switch to referenceId input clicking referenceId tab', async () => {
    addFeatureFlagToLocalStorage(FeatureFlag.OptionListEditor);
    const user = userEvent.setup();
    renderOptionTabs({
      componentProps: { options: [] },
    });

    const referenceIdElement = screen.getByRole('tab', {
      name: textMock('ux_editor.options.tab_referenceId'),
    });
    await user.click(referenceIdElement);

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_referenceId'),
      }),
    ).toBeInTheDocument();
  });
});

type renderOptionTabsProps<T extends ComponentType.Checkboxes | ComponentType.RadioButtons> = {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
  optionListIds?: string[];
};

function renderOptionTabs<T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps = {},
  handleComponentChange = jest.fn(),
  queries = {},
  optionListIds = [],
}: renderOptionTabsProps<T> = {}) {
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
