import React, { forwardRef, useState } from 'react';
import type { ChangeEvent, ReactElement, RefObject } from 'react';
import classes from './ImportFromOrgLibraryDialog.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDialog, StudioHeading, StudioSelect } from '@studio/components';
import { BookIcon, FileImportIcon } from 'libs/studio-icons/src';

export type ImportFromOrgLibraryDialogProps = {
  codeListIds: string[];
  onImportCodeListFromOrg: (codeListId: string) => void;
};

function ImportFromOrgLibraryDialog(
  { codeListIds, onImportCodeListFromOrg }: ImportFromOrgLibraryDialogProps,
  ref: RefObject<HTMLDialogElement>,
): ReactElement {
  const { t } = useTranslation();

  const handleCloseDialog = () => {
    ref.current?.close();
  };

  const handleImportCodeListFromOrg = (codeListId: string) => {
    onImportCodeListFromOrg(codeListId);
    handleCloseDialog();
  };

  return (
    <StudioDialog closedby='any' ref={ref} onClose={handleCloseDialog}>
      <StudioDialog.Block className={classes.headingBlock}>
        <BookIcon className={classes.headingIcon} />
        <StudioHeading level={2}>
          {t('app_content_library.code_lists.import_modal_heading')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <ImportCodeList
          codeListIds={codeListIds}
          onImportCodeListFromOrg={handleImportCodeListFromOrg}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
}

const ForwardedImportFromOrgLibraryDialog = forwardRef(ImportFromOrgLibraryDialog);

export { ForwardedImportFromOrgLibraryDialog as ImportFromOrgLibraryDialog };

type ImportCodeListProps = {
  codeListIds: string[];
  onImportCodeListFromOrg: (codeListId: string) => void;
};

function ImportCodeList({
  codeListIds,
  onImportCodeListFromOrg,
}: ImportCodeListProps): ReactElement {
  const { t } = useTranslation();

  const [selectedCodeListId, setSelectedCodeListId] = useState<string>('');

  const handleSelectCodeListId = (event: ChangeEvent<HTMLSelectElement>) => {
    const codeListId: string = event.target.value;
    setSelectedCodeListId(codeListId);
  };

  const handleImportCodeList = () => {
    setSelectedCodeListId('');
    onImportCodeListFromOrg(selectedCodeListId);
  };

  return (
    <div className={classes.dialogContent}>
      <StudioSelect
        label={t('app_content_library.code_lists.import_modal_select_label')}
        description={t('app_content_library.code_lists.import_modal_select_description')}
        value={selectedCodeListId}
        onChange={handleSelectCodeListId}
      >
        <StudioSelect.Option value='' disabled>
          {t('app_content_library.code_lists.no_code_list_selected')}
        </StudioSelect.Option>
        <CodeListIdOptions codeListIds={codeListIds} />
      </StudioSelect>
      <StudioButton
        icon={<FileImportIcon />}
        className={classes.importButton}
        onClick={handleImportCodeList}
        disabled={!selectedCodeListId}
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
