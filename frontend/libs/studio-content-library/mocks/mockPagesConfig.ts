import type { PagesConfig } from '../src/types/PagesProps';
import type { CodeListData } from '../src';

export const codeListData: CodeListData = {
  title: 'CodeList1',
  data: [{ value: 'value', label: 'label' }],
  hasError: false,
};
export const codeListsDataMock: CodeListData[] = [codeListData];

export const mockPagesConfig: PagesConfig = {
  codeList: {
    props: {
      codeListsData: codeListsDataMock,
      onCreateCodeList: () => {},
      onDeleteCodeList: () => {},
      onUpdateCodeListId: () => {},
      onUpdateCodeList: () => {},
      onUploadCodeList: () => {},
      codeListsUsages: [],
    },
  },
  images: {
    props: {
      images: [{ title: 'image', imageSrc: 'www.external-image-url.com' }],
      onUpdateImage: () => {},
    },
  },
};
