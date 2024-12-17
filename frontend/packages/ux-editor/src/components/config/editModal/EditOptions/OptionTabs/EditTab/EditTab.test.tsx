import React from 'react';
import { EditTab } from './EditTab';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];

describe('EditTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render DisplayChosenOption', async () => {
    renderEditTab();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_custom_list')),
    ).toBeInTheDocument();
  });

  it('should render EditOptionList', async () => {
    renderEditTab({
      componentProps: {
        options: undefined,
      },
    });

    expect(
      screen.getByRole('button', { name: textMock('ux_editor.options.upload_title') }),
    ).toBeInTheDocument();
  });

  it('should set optionsId to blank when removing chosen code list', async () => {
    const user = userEvent.setup();
    const handleOptionsIdChange = jest.fn();
    renderEditTab({ handleComponentChange: handleOptionsIdChange });
    const expectedArgs = mockComponent;
    expectedArgs.optionsId = undefined;
    delete expectedArgs.options;

    const button = await screen.findByText(textMock('general.delete'));
    await user.click(button);

    expect(handleOptionsIdChange).toHaveBeenCalledTimes(1);
    expect(handleOptionsIdChange).toHaveBeenCalledWith(expectedArgs);
  });
});

type renderProps<T extends ComponentType.Checkboxes | ComponentType.RadioButtons> = {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
};

function renderEditTab<T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps = {},
  handleComponentChange = jest.fn(),
}: renderProps<T> = {}) {
  return renderWithProviders(
    <EditTab
      component={{
        ...mockComponent,
        ...componentProps,
      }}
      handleComponentChange={handleComponentChange}
    />,
    {
      queryClient: createQueryClientMock(),
    },
  );
}
