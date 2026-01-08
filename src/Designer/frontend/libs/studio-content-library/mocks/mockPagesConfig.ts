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
      onCreateTextResource: () => {},
      onDeleteCodeList: () => {},
      onUpdateCodeListId: () => {},
      onUpdateCodeList: () => {},
      onUploadCodeList: () => {},
      onUpdateTextResource: () => {},
      codeListsUsages: [],
      textResources,
    },
  },
  codeLists: {
    props: {
      codeLists: [],
      onPublish: () => {},
      onSave: () => {},
      publishedCodeLists: [],
    },
  },
  images: {
    props: {
      images: [{ title: 'image', imageSrc: 'www.external-image-url.com' }],
      onUpdateImage: () => {},
    },
  },
};
