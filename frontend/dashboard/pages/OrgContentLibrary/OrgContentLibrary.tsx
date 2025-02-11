import type { ReactElement } from 'react';
import React from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useDeleteOrgCodeListMutation } from 'app-shared/hooks/mutations/useDeleteOrgCodeListMutation';

export function OrgContentLibrary(): ReactElement {
  const org = useSelectedContext();
  const { mutate: deleteCodeList } = useDeleteOrgCodeListMutation(org);

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: [],
          onDeleteCodeList: deleteCodeList,
          onUpdateCodeListId: () => {},
          onUpdateCodeList: () => {},
          onUploadCodeList: () => {},
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
}
