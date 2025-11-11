import type { PagesConfig, CodeListDataWithTextResources } from '../src';
import { textResources } from '../src/test-data/textResources';

export const codeListData: CodeListDataWithTextResources = {
  title: 'CodeList1',
  data: [{ value: 'value', label: 'label' }],
  hasError: false,
};
export const codeListsDataMock: CodeListDataWithTextResources[] = [codeListData];

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
    props: {
      codeLists: [],
    },
  },
  images: {
    props: {
      images: [{ title: 'image', imageSrc: 'www.external-image-url.com' }],
      onUpdateImage: () => {},
    },
  },
};
