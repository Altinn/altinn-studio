import type { PagesConfig } from '../src/types/PagesProps';
import type { UseLibraryQuery } from '../src/types/useLibraryQuery';
import type { CodeList } from '@studio/components';

const getCodeListMock: UseLibraryQuery<CodeList, string> = (optionListId: string) => {
  return { data: [], isError: false };
};

export const mockPagesConfig: PagesConfig = {
  codeList: {
    props: {
      codeListIds: ['CodeList1', 'CodeList2'],
      getCodeList: getCodeListMock,
      onUpdateCodeList: () => {},
      onUploadCodeList: () => {},
    },
  },
  images: {
    props: {
      images: [{ title: 'image', imageSrc: 'www.external-image-url.com' }],
      onUpdateImage: () => {},
    },
  },
};
