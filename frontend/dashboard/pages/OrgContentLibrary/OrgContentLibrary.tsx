import type { ReactElement } from 'react';
import React from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';

export function OrgContentLibrary(): ReactElement {
  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: [],
          onDeleteCodeList: () => {},
          onUpdateCodeListId: () => {},
          onUpdateCodeList: () => {},
          onUploadCodeList: () => {},
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
}
