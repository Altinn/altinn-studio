import type { PagesConfig } from '../src/types/PagesProps';
import type { OnGetCodeListResult } from '../src';

const onGetCodeListResult = (codeListId: string): OnGetCodeListResult => {
  return { codeListWithMetadata: { title: codeListId, codeList: [] }, isError: false };
};

export const mockPagesConfig: PagesConfig = {
  codeList: {
    props: {
      codeListIds: ['CodeList1', 'CodeList2'],
      onGetCodeList: onGetCodeListResult,
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
