import React from 'react';
import { screen } from '@testing-library/react';
import { componentMocks } from '../../../../../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResources } from 'app-shared/types/global';
import userEvent from '@testing-library/user-event';
import { ManualOptionsPanel, type ManualOptionsPanelProps } from './ManualOptionsPanel';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const onDeleteButtonClick = jest.fn();
const onEditButtonClick = jest.fn();
const textResources: ITextResources = {
  nb: [
    { id: 'some-id', value: 'label 1' },
    { id: 'another-id', value: 'label 2' },
    { id: 'description-id', value: 'description' },
  ],
};

describe('ManualOptionsPanel', () => {
  afterEach(jest.clearAllMocks);

  it('should render the open Dialog button', () => {
    renderManualOptionsEditor();
    expect(getEditButton()).toBeInTheDocument();
  });

  it('Calls onEditButtonClick when the edit button is clicked', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor();
    await user.click(getEditButton());
    expect(onEditButtonClick).toHaveBeenCalledTimes(1);
  });

  it('should show placeholder for option label when label is empty', () => {
    renderManualOptionsEditor({
      props: {
        component: {
          ...mockComponent,
          options: [{ value: 1, label: '' }],
        },
      },
    });

    expect(screen.getByText(textMock('general.empty_string'))).toBeInTheDocument();
  });

  it('should call onDeleteButtonClick when removing chosen options', async () => {
    const user = userEvent.setup();
    renderManualOptionsEditor();

    await user.click(getDeleteButton());

    expect(onDeleteButtonClick).toHaveBeenCalledTimes(1);
  });
});

function getEditButton() {
  return screen.getByRole('button', {
    name: textMock('general.edit'),
  });
}

function getDeleteButton() {
  return screen.getByRole('button', {
    name: textMock('general.delete'),
  });
}

const defaultProps: ManualOptionsPanelProps = {
  onDeleteButtonClick,
  component: mockComponent,
  textResources,
  onEditButtonClick,
};

function renderManualOptionsEditor({
  queries = {},
  props = {},
  queryClient = createQueryClientMock(),
} = {}) {
  renderWithProviders(<ManualOptionsPanel {...defaultProps} {...props} />, {
    queries,
    queryClient,
  });
}
