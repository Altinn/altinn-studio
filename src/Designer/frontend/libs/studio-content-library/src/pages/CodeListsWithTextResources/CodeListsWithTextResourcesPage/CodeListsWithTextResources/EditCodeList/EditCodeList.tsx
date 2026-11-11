import type { CodeListWithTextResources, CodeListEditorTexts } from '@studio/components';
import type { TextResource } from '@studio/pure-functions';
import {
  StudioCodeListEditorWithTextResources,
  StudioDeleteButton,
  StudioDisplayTile,
  StudioDialog,
  StudioHeading,
  StudioToggleableTextfield,
} from '@studio/components';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../../types/CodeListWithMetadata';
import { useCodeListEditorTexts } from '../../hooks/useCodeListEditorTexts';
import { EyeIcon, KeyVerticalIcon } from '@studio/icons';
import { ArrayUtils, FileNameUtils } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from '../../hooks/useInputCodeListNameErrorMessage';
import type { CodeListIdSource } from '../../types/CodeListReference';
import { CodeListUsages } from './CodeListUsages/CodeListUsages';
import classes from './EditCodeList.module.css';

export type EditCodeListProps = {
  codeList: CodeListWithTextResources;
  codeListTitle: string;
  onCreateTextResource: (textResource: TextResource) => void;
  onDeleteCodeList: (codeListId: string) => void;
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  onUpdateTextResource: (textResource: TextResource) => void;
  codeListNames: string[];
  codeListSources: CodeListIdSource[];
  codeListsUsagesUnknown?: boolean;
  textResources?: TextResource[];
};

export function EditCodeList({
  codeList,
  codeListTitle,
  onCreateTextResource,
  onDeleteCodeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  onUpdateTextResource,
  codeListNames,
  codeListSources,
  codeListsUsagesUnknown = false,
  textResources = [],
}: EditCodeListProps): React.ReactElement {
  const editorTexts: CodeListEditorTexts = useCodeListEditorTexts();

  const handleUpdateCodeList = (updatedCodeList: CodeListWithTextResources): void => {
    const updatedCodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListTitle, codeList: codeList },
      updatedCodeList,
    );
    onUpdateCodeList(updatedCodeListWithMetadata);
  };

  const handleDeleteCodeList = (): void => onDeleteCodeList(codeListTitle);

  const codeListHasUsages = codeListSources.length > 0;
  // Components refer to the code list by its id, so it is neither deleted nor renamed while a component might use it.
  const lockReason: LockReason | undefined = getLockReason(
    codeListsUsagesUnknown,
    codeListHasUsages,
  );

  return (
    <div className={classes.editCodeList}>
      <EditCodeListTitle
        codeListTitle={codeListTitle}
        lockReason={lockReason}
        codeListNames={codeListNames}
        onUpdateCodeListId={onUpdateCodeListId}
      />
      <StudioCodeListEditorWithTextResources
        codeList={codeList}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        onUpdateCodeList={handleUpdateCodeList}
        texts={editorTexts}
        textResources={textResources}
      />
      <CodeListButtons
        lockReason={lockReason}
        codeListHasUsages={codeListHasUsages}
        codeListSources={codeListSources}
        onDeleteCodeList={handleDeleteCodeList}
        codeListTitle={codeListTitle}
      />
    </div>
  );
}

type LockReason = 'usagesUnknown' | 'inUse';

function getLockReason(usagesUnknown: boolean, hasUsages: boolean): LockReason | undefined {
  if (usagesUnknown) return 'usagesUnknown';
  if (hasUsages) return 'inUse';
  return undefined;
}

const usagesUnknownTextKey =
  'app_content_library.code_lists_with_text_resources.code_list_usages_unknown';

export const updateCodeListWithMetadata = (
  currentCodeListWithMetadata: CodeListWithMetadata,
  updatedCodeList: CodeListWithTextResources,
): CodeListWithMetadata => {
  return { ...currentCodeListWithMetadata, codeList: updatedCodeList };
};

type EditCodeListTitleProps = {
  codeListTitle: string;
  lockReason: LockReason | undefined;
  codeListNames: string[];
  onUpdateCodeListId: (codeListId: string, newCodeListId: string) => void;
};

function EditCodeListTitle({
  codeListTitle,
  lockReason,
  codeListNames,
  onUpdateCodeListId,
}: EditCodeListTitleProps): React.ReactElement {
  const { t } = useTranslation();
  const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();

  const handleUpdateCodeListId = (newCodeListId: string): void => {
    if (newCodeListId !== codeListTitle) onUpdateCodeListId(codeListTitle, newCodeListId);
  };

  const handleValidateCodeListId = (newCodeListId: string): string | undefined => {
    const invalidCodeListNames = ArrayUtils.removeItemByValue(codeListNames, codeListTitle);
    const fileNameError = FileNameUtils.findFileNameError(newCodeListId, invalidCodeListNames);
    return getInvalidInputFileNameErrorMessage(fileNameError);
  };

  const disabledTitleKey =
    lockReason === 'usagesUnknown'
      ? usagesUnknownTextKey
      : 'app_content_library.code_lists_with_text_resources.code_list_edit_id_disabled_title';

  return !lockReason ? (
    <StudioToggleableTextfield
      customValidation={handleValidateCodeListId}
      label={t('app_content_library.code_lists_with_text_resources.code_list_edit_id_label')}
      onBlur={(event) => handleUpdateCodeListId(event.target.value)}
      title={t('app_content_library.code_lists_with_text_resources.code_list_view_id_title', {
        codeListName: codeListTitle,
      })}
      value={codeListTitle}
    />
  ) : (
    <StudioDisplayTile
      title={t(disabledTitleKey)}
      label={t('app_content_library.code_lists_with_text_resources.code_list_edit_id_label')}
      value={codeListTitle}
      icon={<KeyVerticalIcon />}
      className={classes.displayTitle}
    />
  );
}

type CodeListButtonsProps = {
  lockReason: LockReason | undefined;
  codeListHasUsages: boolean;
  codeListSources: CodeListIdSource[];
  onDeleteCodeList: (codeListId: string) => void;
  codeListTitle: string;
};

function CodeListButtons({
  lockReason,
  codeListHasUsages,
  codeListSources,
  onDeleteCodeList,
  codeListTitle,
}: CodeListButtonsProps): React.ReactElement {
  const { t } = useTranslation();
  const deleteButtonTitle = t(getDeleteButtonTitleKey(lockReason));

  return (
    <div className={classes.buttons}>
      <StudioDeleteButton
        onDelete={() => onDeleteCodeList(codeListTitle)}
        title={deleteButtonTitle}
        disabled={!!lockReason}
        confirmMessage={t(
          'app_content_library.code_lists_with_text_resources.code_list_delete_confirm',
          {
            codeListTitle,
          },
        )}
      >
        {t('app_content_library.code_lists_with_text_resources.code_list_delete')}
      </StudioDeleteButton>
      {codeListHasUsages && <ShowCodeListUsagesSourcesModal codeListSources={codeListSources} />}
    </div>
  );
}

function getDeleteButtonTitleKey(lockReason: LockReason | undefined): string {
  switch (lockReason) {
    case 'usagesUnknown':
      return usagesUnknownTextKey;
    case 'inUse':
      return 'app_content_library.code_lists_with_text_resources.code_list_delete_disabled_title';
    default:
      return 'app_content_library.code_lists_with_text_resources.code_list_delete_enabled_title';
  }
}

export type ShowCodeListUsagesSourcesModalProps = {
  codeListSources: CodeListIdSource[];
};

function ShowCodeListUsagesSourcesModal({
  codeListSources,
}: ShowCodeListUsagesSourcesModalProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger
        icon={<EyeIcon className={classes.seeUsageIcon} />}
        variant='tertiary'
        className={classes.codeListUsageButton}
      >
        {t('app_content_library.code_lists_with_text_resources.code_list_show_usage')}
      </StudioDialog.Trigger>
      <StudioDialog className={classes.codeListUsageModal} closedby='any'>
        <StudioDialog.Block>
          <StudioHeading level={2}>
            {t(
              'app_content_library.code_lists_with_text_resources.code_list_show_usage_modal_title',
            )}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <CodeListUsages codeListSources={codeListSources} />
        </StudioDialog.Block>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
}
