import type { PagesConfig } from '../src/types/PagesProps';

export const mockPagesConfig: PagesConfig = {
  codeList: {
    props: {
      codeLists: [
        { title: 'CodeList1', codeList: [] },
        { title: 'CodeList2', codeList: [] },
      ],
      onUpdateCodeList: () => {},
      onUploadCodeList: () => {},
      fetchDataError: false,
    },
  },
  images: {
    props: {
      images: [{ title: 'image', imageSrc: 'www.external-image-url.com' }],
      onUpdateImage: () => {},
    },
  },
};
