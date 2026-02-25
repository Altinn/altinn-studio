import React from 'react';
import { screen } from '@testing-library/react';
import { ValidateCardContent, type ValidateCardContentProps } from './ValidateCardContent';
import { Scope } from '../utils/ValidateNavigationUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { selectSuggestionOption } from '../utils/ValidateNavigationTestUtils';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const layoutSet1NameMock = 'test-layout-set';
const layoutSets = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'Task',
    },
  ],
};

describe('ValidateCardContent', () => {
  it('renders page selector when scope is SelectedPages', () => {
    renderValidateCardContent({ scope: Scope.SelectedPages });
    const pageSelector = screen.getByText(
      textMock('ux_editor.settings.navigation_validation_specific_page_label'),
    );
    expect(pageSelector).toBeInTheDocument();
  });

  it('should not render task or page selector when scope is AllTasks', () => {
    renderValidateCardContent({ scope: Scope.AllTasks });
    const taskSelector = screen.queryByText(
      textMock('ux_editor.settings.navigation_validation_specific_task_label_several'),
    );
    const pageSelector = screen.queryByText(
      textMock('ux_editor.settings.navigation_validation_specific_page_label'),
    );
    expect(taskSelector).not.toBeInTheDocument();
    expect(pageSelector).not.toBeInTheDocument();
  });

  it('should call onChange with correct values when task is changed in SelectedTasks scope', async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    renderValidateCardContent({ scope: Scope.SelectedTasks, onChange: mockOnChange });
    const selectorLabel = textMock(
      'ux_editor.settings.navigation_validation_specific_task_label_several',
    );
    const optionLabel = layoutSet1NameMock;
    await selectSuggestionOption({ user, selectorLabel, optionLabel });
    expect(mockOnChange).toHaveBeenCalledWith({
      tasks: [{ label: layoutSet1NameMock, value: layoutSet1NameMock }],
    });
  });

  it('should call onChange with correct values when task is changed in SelectedPages scope', async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    renderValidateCardContent({ scope: Scope.SelectedPages, onChange: mockOnChange });
    const selectorLabel = textMock('ux_editor.settings.navigation_validation_specific_task_label');
    const optionLabel = layoutSet1NameMock;
    await selectSuggestionOption({ user, selectorLabel, optionLabel });

    expect(mockOnChange).toHaveBeenCalledWith({
      task: { label: layoutSet1NameMock, value: layoutSet1NameMock },
      pages: [],
    });
  });
});

const renderValidateCardContent = ({
  scope,
  onChange = jest.fn(),
}: Partial<ValidateCardContentProps>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);

  const mockConfig = {
    types: [],
    pageScope: { label: '', value: '' },
    tasks: [],
  };

  renderWithProviders(
    <ValidateCardContent scope={scope} config={mockConfig} onChange={onChange} />,
    { queryClient },
  );
};
