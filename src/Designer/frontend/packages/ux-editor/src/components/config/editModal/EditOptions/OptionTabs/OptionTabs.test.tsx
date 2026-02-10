import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../types/FormItem';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../testing/mocks';
import { OptionTabs } from './OptionTabs';
import { componentMocks } from '../../../../../testing/componentMocks';
import { app, org } from '@studio/testing/testids';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const queryClient = createQueryClientMock();
queryClient.setQueryData([QueryKey.TextResources, org, app], { nb: [], nn: [], en: [] });

describe('OptionTabs', () => {
  afterEach(jest.clearAllMocks);

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
      optionListIdsFromLibrary: [optionsId],
    });

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_code_list'),
      }),
    ).toBeInTheDocument();
  });

  it('should show referenceId tab when component has optionsId defined not matching an optionId in optionsId-list', () => {
    const optionsId = 'optionsId';
    queryClient.setQueryData([QueryKey.OptionListIds], []);
    renderOptionTabs({
      componentProps: {
        optionsId,
        options: undefined,
      },
      optionListIdsFromLibrary: [],
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
    renderOptionTabs({
      componentProps: {
        optionsId,
        options: undefined,
      },
      optionListIdsFromLibrary: [],
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
      name: textMock('ux_editor.options.tab_reference_id'),
    });
    await user.click(referenceIdElement);

    expect(
      screen.getByRole('tab', {
        name: textMock('ux_editor.options.tab_reference_id'),
      }),
    ).toBeInTheDocument();
  });

  it('should render the preview title for manual options when manual options are set and featureFlag is enabled', async () => {
    const options = [{ value: '1', label: 'label 1' }];
    renderOptionTabs({
      componentProps: {
        optionsId: undefined,
        options,
      },
    });

    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_code_list_custom_list')),
    ).toBeInTheDocument();
  });

  it('should switch to referenceId input clicking referenceId tab', async () => {
    const user = userEvent.setup();
    renderOptionTabs({
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

type RenderOptionTabsProps<T extends ComponentType.Checkboxes | ComponentType.RadioButtons> = {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
  optionListIdsFromLibrary?: string[];
};

function renderOptionTabs<T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps = {},
  handleComponentChange = jest.fn(),
  queries = {},
  optionListIdsFromLibrary = [],
}: RenderOptionTabsProps<T> = {}) {
  return renderWithProviders(
    <OptionTabs
      codeListIdContextData={{ idsFromAppLibrary: optionListIdsFromLibrary, orgName: org }}
      handleComponentChange={handleComponentChange}
      component={{
        ...mockComponent,
        ...componentProps,
      }}
    />,
    {
      queries,
      queryClient,
    },
  );
}
