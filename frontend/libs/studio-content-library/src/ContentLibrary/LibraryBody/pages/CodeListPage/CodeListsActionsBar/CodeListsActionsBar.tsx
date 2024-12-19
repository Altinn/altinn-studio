import React from 'react';
import { StudioFileUploader, StudioSearch } from '@studio/components';
import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { StudioFileUploader } from '@studio/components';
import classes from './CodeListsActionsBar.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListWithMetadata } from '../CodeListPage';
import { CreateNewCodeListModal } from './CreateNewCodeListModal/CreateNewCodeListModal';
import { FileNameUtils } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from '../hooks/useUploadCodeListNameErrorMessage';
import { toast } from 'react-toastify';

type CodeListsActionsBarProps = {
  onUploadCodeList: (updatedCodeList: File) => void;
  onUpdateCodeList: (updatedCodeList: CodeListWithMetadata) => void;
  codeListNames: string[];
  codeLists: CodeListWithMetadata[];
  onSetCodeListsSearchMatch: (codeListsSearchMatch: CodeListWithMetadata[]) => void;
};

export function CodeListsActionsBar({
  onUploadCodeList,
  onUpdateCodeList,
  codeListNames,
  codeLists,
  onSetCodeListsSearchMatch,
}: CodeListsActionsBarProps) {
  const { t } = useTranslation();
  const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
  const [codeListSearchPattern, setCodeListSearchPattern] = useState<string>('*');

  const handleSearchCodeLists = useCallback(
    (codeListPatternMatch: string) => {
      if (codeListPatternMatch !== '*') {
        const filteredCodeLists = getCodeListsSearchMatch(codeLists, codeListPatternMatch);
        onSetCodeListsSearchMatch(filteredCodeLists);
        return;
      }
      onSetCodeListsSearchMatch(codeLists);
    },
    [codeLists, onSetCodeListsSearchMatch],
  );

  useEffect(() => {
    handleSearchCodeLists(codeListSearchPattern);
  }, [codeListNames, handleSearchCodeLists, codeListSearchPattern]);

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

  return (
    <div className={classes.actionsBar}>
      <StudioSearch
        className={classes.searchField}
        label={t('app_content_library.code_lists.search_label')}
        size='sm'
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setCodeListSearchPattern(event.target.value)
        }
        onClear={() => setCodeListSearchPattern('*')}
      />
      <CreateNewCodeListModal onUpdateCodeList={onUpdateCodeList} codeListNames={codeListNames} />
      <StudioFileUploader
        accept='.json'
        size='small'
        variant='tertiary'
        uploaderButtonText={t('app_content_library.code_lists.upload_code_list')}
        onSubmit={onSubmit}
      />
    </div>
  );
}

const escapeRegExp = (pattern: string): string => {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getCodeListsSearchMatch = (
  codeLists: CodeListWithMetadata[],
  codeListPatternMatch: string,
): CodeListWithMetadata[] => {
  const safePattern = escapeRegExp(codeListPatternMatch);
  const regex = new RegExp(safePattern, 'i');
  return codeLists.filter((codeList) => regex.test(codeList.title));
};
