import { render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { CodeListsPage } from './CodeListsPage';
import type { CodeListsPageProps } from './CodeListsPage';
import React from 'react';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { codeLists } from './test-data/codeLists';

// Test data:
const defaultProps: CodeListsPageProps = { codeLists };

describe('CodeListsPage', () => {
  it('Renders with the given code lists', () => {
    renderCodeListPage();
    codeLists.forEach((codeList) => {
      expect(getCodeListHeading(codeList.name)).toBeInTheDocument();
    });
  });

  it('Adds a new code list when the add button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));
    const nameOfNewList = textMock('app_content_library.code_lists.unnamed');
    expect(getCodeListHeading(nameOfNewList)).toBeInTheDocument();
  });

  it('Rerenders with updated data when something is changed', async () => {
    const user = userEvent.setup();
    const newName = 'New code list name';
    renderCodeListPage();
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));

    const details = getCodeListDetails(textMock('app_content_library.code_lists.unnamed'));
    const nameLabel = textMock('app_content_library.code_lists.name');
    const nameInput = within(details).getByRole('textbox', { name: nameLabel });
    await user.type(nameInput, newName);

    expect(getCodeListHeading(newName)).toBeInTheDocument();
  });

  it('Deletes the code list when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));
    const nameOfNewList = textMock('app_content_library.code_lists.unnamed');
    const details = getCodeListDetails(nameOfNewList);
    const deleteButton = within(details).getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);
    expect(queryCodeListHeading(nameOfNewList)).not.toBeInTheDocument();
  });

  it('Displays a placeholder when the list of code lists is empty', () => {
    renderCodeListPage({ codeLists: [] });
    const placeholderText = textMock('app_content_library.code_lists.empty');
    expect(screen.getByText(placeholderText)).toBeInTheDocument();
  });
});

function renderCodeListPage(props?: CodeListsPageProps): RenderResult {
  return render(<CodeListsPage {...defaultProps} {...props} />);
}

function getCodeListDetails(name: string): HTMLElement {
  // The following code accesses a node directly with parentElement. This is not recommended, hence the Eslint rule, but there is no other way to access the details element.
  // Todo: Use getByRole('group') when the role becomes correctly assigned to the component: https://github.com/digdir/designsystemet/issues/3941
  const { parentElement } = getCodeListHeading(name); // eslint-disable-line testing-library/no-node-access
  /* istanbul ignore else */
  if (parentElement) return parentElement;
  else throw new Error('Could not find code list details element.');
}

const getCodeListHeading = (name: string): HTMLElement => screen.getByRole('button', { name });

const queryCodeListHeading = (name: string): HTMLElement | null =>
  screen.queryByRole('button', { name });
