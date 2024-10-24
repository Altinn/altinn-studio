import { ResourceContentLibraryImpl } from '@studio/content-library';
import React from 'react';

export const AppContentLibrary = (): React.ReactElement => {
  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeLists: [],
          onUpdateCodeList: () => {},
        },
      },
      images: {
        props: {
          images: [],
          onUpdateImage: () => {},
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
};
