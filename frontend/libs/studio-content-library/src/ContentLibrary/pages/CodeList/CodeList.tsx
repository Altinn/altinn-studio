import React from 'react';
import { Alert } from '@digdir/designsystemet-react';
import { StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type CodeList = {
  title: string;
  codeList: any;
};

export type CodeListProps = {
  codeLists: CodeList[];
  onUpdateCodeList: (codeListId: string, updatedCodeList: CodeList) => void;
};
export const CodeList = ({ codeLists, onUpdateCodeList }: CodeListProps) => {
  const { t } = useTranslation();

  const noExistingCodeLists = codeLists.length === 0;

  return (
    <div>
      <StudioHeading size='small'>{t('app_content_library.code_lists.page_name')}</StudioHeading>
      {noExistingCodeLists ? (
        <Alert size='small'>{t('app_content_library.code_lists.no_content')}</Alert>
      ) : (
        codeLists.map((codeList) => (
          <>
            {codeList.title}
            <button onClick={() => onUpdateCodeList(codeList.title, codeList.codeList)}>
              Oppdater kodeliste
            </button>
          </>
        ))
      )}
    </div>
  );
};
