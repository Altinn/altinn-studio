import React, { forwardRef, useState } from 'react';
import type { ChangeEvent, ReactElement, RefObject } from 'react';
import classes from './ImportFromOrgLibraryModal.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDialog, StudioHeading, StudioSelect } from '@studio/components';
import { BookIcon, FileImportIcon } from '@studio/icons';

type ImportFromOrgLibraryModalProps = {
  codeListIds: string[];
};

function ImportFromOrgLibraryModal(
  { codeListIds }: ImportFromOrgLibraryModalProps,
  ref: RefObject<HTMLDialogElement>,
): ReactElement {
  const { t } = useTranslation();

  const handleCloseDialog = () => {
    ref.current?.close();
  };

  return (
    <StudioDialog open closedby='any' ref={ref} onClose={handleCloseDialog}>
      <StudioDialog.Block className={classes.headingBlock}>
        <BookIcon className={classes.headingIcon} />
        <StudioHeading level={2}>
          {t('app_content_library.code_lists.import_modal_heading')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <ImportCodeList codeListIds={codeListIds} />
      </StudioDialog.Block>
    </StudioDialog>
  );
}

const ForwardedImportFromOrgLibraryModal = forwardRef(ImportFromOrgLibraryModal);

export { ForwardedImportFromOrgLibraryModal as ImportFromOrgLibraryModal };

type ImportCodeListProps = {
  codeListIds: string[];
};
function ImportCodeList({ codeListIds }: ImportCodeListProps): ReactElement {
  const { t } = useTranslation();

  const [selectedCodeListId, setSelectedCodeListId] = useState<string>('');

  const handleSelectCodeListId = (event: ChangeEvent<HTMLSelectElement>) => {
    const codeListId: string = event.target.value;
    setSelectedCodeListId(codeListId);
  };

  const handleImportCodeList = () => {
    console.log('selectedCodeListId', selectedCodeListId);
  };

  return (
    <div className={classes.dialogContent}>
      <StudioSelect
        label={t('app_content_library.code_lists.import_modal_select_label')}
        value={selectedCodeListId}
        onChange={handleSelectCodeListId}
      >
        <StudioSelect.Option value='' disabled>
          Ingen valgt
        </StudioSelect.Option>
        <CodeListIdOptions codeListIds={codeListIds} />
      </StudioSelect>

      <StudioButton
        icon={<FileImportIcon />}
        className={classes.importButton}
        onClick={handleImportCodeList}
      >
        {t('app_content_library.code_lists.import_modal_import_button')}
      </StudioButton>
    </div>
  );
}

type CodeListIdOptionsProps = {
  codeListIds: string[];
};
function CodeListIdOptions({ codeListIds }: CodeListIdOptionsProps): ReactElement[] {
  return codeListIds.map((codeListId: string) => (
    <StudioSelect.Option key={codeListId} value={codeListId}>
      {codeListId}
    </StudioSelect.Option>
  ));
}
