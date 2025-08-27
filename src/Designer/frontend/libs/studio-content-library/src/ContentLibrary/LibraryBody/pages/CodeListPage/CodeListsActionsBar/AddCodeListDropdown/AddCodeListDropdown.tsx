import React, { useRef } from 'react';
import type { ReactElement } from 'react';
import classes from './AddCodeListDropdown.module.css';
import { useTranslation } from 'react-i18next';
import { CreateNewCodeListDialog } from './CreateNewCodeListDialog';
import { FileNameUtils } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from '../../hooks/useUploadCodeListNameErrorMessage';
import { toast } from 'react-toastify';
import { StudioDropdown } from '@studio/components';
import { FileImportIcon, PlusCircleIcon, PlusIcon, UploadIcon } from '@studio/icons';
import type { CodeListWithMetadata } from '../../types/CodeListWithMetadata';
import type { TextResource } from '@studio/components-legacy';
import { ImportFromOrgLibraryDialog } from './ImportFromOrgLibraryDialog';
import type { ExternalResource } from 'app-shared/types/ExternalResource';
import { getCodeListIdsFromExternalResources } from './utils';

export type AddCodeListDropdownProps = {
  onCreateCodeList: (newCodeList: CodeListWithMetadata) => void;
  onCreateTextResource?: (textResource: TextResource) => void;
  onUpdateTextResource?: (textResource: TextResource) => void;
  onUploadCodeList: (updatedCodeList: File) => void;
  codeListNames: string[];
  textResources?: TextResource[];
  externalResources?: ExternalResource[];
  onImportCodeListFromOrg?: (codeListId: string) => void;
};

export function AddCodeListDropdown({
  codeListNames,
  onCreateCodeList,
  onCreateTextResource,
  onUpdateTextResource,
  onUploadCodeList,
  textResources,
  externalResources,
  onImportCodeListFromOrg,
}: AddCodeListDropdownProps): ReactElement {
  const { t } = useTranslation();
  const addCodeListRef = useRef<HTMLDialogElement>(null);
  const importCodeListRef = useRef<HTMLDialogElement>(null);
  const codeListIds: string[] = getCodeListIdsFromExternalResources(externalResources);
  const hasExternalResources: boolean = externalResources && externalResources.length > 0;

  const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();

  const onSubmit = (file: File) => {
    const fileNameError = FileNameUtils.findFileNameError(
      FileNameUtils.removeExtension(file.name),
      codeListNames,
    );
    if (fileNameError) {
      return toast.error(getInvalidUploadFileNameErrorMessage(fileNameError));
    }
    onUploadCodeList(file);
  };

  const handleOpenAddCodeListDialog = () => {
    addCodeListRef.current?.showModal();
  };

  const handleOpenImportCodeListDialog = () => {
    importCodeListRef.current?.showModal();
  };

  return (
    <>
      <StudioDropdown
        triggerButtonVariant='secondary'
        triggerButtonText={t('app_content_library.code_lists.add_new_code_list')}
        icon={<PlusIcon />}
        className={classes.dropdown}
      >
        <StudioDropdown.Item>
          <StudioDropdown.Button onClick={handleOpenAddCodeListDialog} icon={<PlusCircleIcon />}>
            {t('app_content_library.code_lists.create_new_code_list')}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.FileUploaderButton
            icon={<UploadIcon />}
            onFileUpload={onSubmit}
            fileInputProps={{ accept: '.json' }}
            uploadButtonText={t('app_content_library.code_lists.upload_code_list')}
          />
        </StudioDropdown.Item>
        {hasExternalResources && (
          <StudioDropdown.Item>
            <StudioDropdown.Button
              onClick={handleOpenImportCodeListDialog}
              icon={<FileImportIcon />}
            >
              {t('app_content_library.code_lists.import_from_org_library')}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        )}
      </StudioDropdown>
      <CreateNewCodeListDialog
        codeListNames={codeListNames}
        onCreateCodeList={onCreateCodeList}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        textResources={textResources}
        ref={addCodeListRef}
      />
      {hasExternalResources && (
        <ImportFromOrgLibraryDialog
          codeListIds={codeListIds}
          ref={importCodeListRef}
          onImportCodeListFromOrg={onImportCodeListFromOrg}
        />
      )}
    </>
  );
}
