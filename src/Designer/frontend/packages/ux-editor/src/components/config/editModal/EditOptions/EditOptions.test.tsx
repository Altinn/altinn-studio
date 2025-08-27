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
