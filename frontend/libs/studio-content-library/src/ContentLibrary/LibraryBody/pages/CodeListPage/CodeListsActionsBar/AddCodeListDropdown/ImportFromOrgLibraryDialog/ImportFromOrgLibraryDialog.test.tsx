import React, { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportFromOrgLibraryDialog } from './';
import type { ImportFromOrgLibraryDialogProps } from './ImportFromOrgLibraryDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onImportCodeListFromOrg = jest.fn();
const codeListIds: string[] = ['codeList1', 'codeList2'];

describe('ImportFromOrgLibraryDialog', () => {
  afterEach(jest.clearAllMocks);

  it('renders the select with all its options and correct default option selected', () => {
    renderImportFromOrgLibraryDialog();
    const select = getSelect();
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('');
    expect(
      getOption(textMock('app_content_library.code_lists.no_code_list_selected')),
    ).toBeInTheDocument();
    codeListIds.forEach((codeListId) => {
      expect(getOption(codeListId)).toBeInTheDocument();
    });
  });

  it('disables the import button when no option is selected', () => {
    renderImportFromOrgLibraryDialog();
    const button = getButton(textMock('app_content_library.code_lists.import_modal_import_button'));
    expect(button).toBeDisabled();
  });

  it('enables the import button when an option is selected', async () => {
    const user = userEvent.setup();
    renderImportFromOrgLibraryDialog();
    const button = getButton(textMock('app_content_library.code_lists.import_modal_import_button'));
    expect(button).toBeDisabled();
    const optionToSelect: string = codeListIds[0];
    const select = getSelect();
    await user.selectOptions(select, optionToSelect);
    expect(button).toBeEnabled();
  });

  it('calls onImportCodeListFromOrg with the selected code list id', async () => {
    const user = userEvent.setup();
    renderImportFromOrgLibraryDialog();
    const select = getSelect();
    const optionToSelect: string = codeListIds[0];
    await user.selectOptions(select, optionToSelect);
    const button = getButton(textMock('app_content_library.code_lists.import_modal_import_button'));
    await user.click(button);
    expect(onImportCodeListFromOrg).toHaveBeenCalledTimes(1);
    expect(onImportCodeListFromOrg).toHaveBeenCalledWith(optionToSelect);
  });

  it('clears the select value after import', async () => {
    const user = userEvent.setup();
    renderImportFromOrgLibraryDialog();
    const select = getSelect();
    const optionToSelect: string = codeListIds[0];
    await user.selectOptions(select, optionToSelect);
    expect(select).toHaveValue(optionToSelect);
    const button = getButton(textMock('app_content_library.code_lists.import_modal_import_button'));
    await user.click(button);
    expect(select).toHaveValue('');
  });
});

const getSelect = (): HTMLSelectElement =>
  screen.getByRole('combobox', {
    name: textMock('app_content_library.code_lists.import_modal_select_label'),
  });
const getOption = (name: string): HTMLOptionElement => screen.getByRole('option', { name });
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });

const defaultProps: ImportFromOrgLibraryDialogProps = {
  codeListIds,
  onImportCodeListFromOrg,
};

const renderImportFromOrgLibraryDialog = (
  props: Partial<ImportFromOrgLibraryDialogProps> = {},
): RenderResult => {
  const Component = (): ReactElement => {
    const ref = useRef<HTMLDialogElement>(null);
    useShowModal(ref);

    return <ImportFromOrgLibraryDialog ref={ref} {...defaultProps} {...props} />;
  };

  return render(<Component />);
};

const useShowModal = (ref: React.RefObject<HTMLDialogElement>) => {
  useEffect(() => {
    ref.current?.showModal();
  }, [ref]);
};
