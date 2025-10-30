import type { PagesConfig } from '../src/types/PagesProps';
import type { CodeListData } from '../src';
import { textResources } from '../src/test-data/textResources';

export const codeListData: CodeListData = {
  title: 'CodeList1',
  data: [{ value: 'value', label: 'label' }],
  hasError: false,
};
export const codeListsDataMock: CodeListData[] = [codeListData];

export const mockPagesConfig: PagesConfig = {
  codeListsWithTextResources: {
    props: {
      codeListDataList: codeListsDataMock,
      onCreateCodeList: () => {},
      onDeleteCodeList: () => {},
      onUpdateCodeListId: () => {},
      onUpdateCodeList: () => {},
      onUploadCodeList: () => {},
      codeListsUsages: [],
      textResources,
    },
  },
  codeLists: {
    props: {},
  },
  images: {
    props: {
      images: [{ title: 'image', imageSrc: 'www.external-image-url.com' }],
      onUpdateImage: () => {},
    },
  },
};
