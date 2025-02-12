import React from 'react';

import { ResourceContentLibraryImpl } from '@studio/content-library';

export const ContentLibrary = () => {
  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: [
            {
              title: 'test',
              data: [
                {
                  label: 'test',
                  value: 'test',
                },
              ],
            },
          ],
          onUpdateCodeList: () => {},
          codeListsUsages: [],
          onUpdateCodeListId: () => {},
          onUploadCodeList: () => {},
        },
      },
    },
  });
  return <div>{getContentResourceLibrary()}</div>;
};
