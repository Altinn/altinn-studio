import { componentConfig } from '@app/layout-contract/generated/components/PDFPreviewButton/config.generated';

import { PDFPreviewButton } from 'src/layout/PDFPreviewButton/index';

export function getConfig() {
  return {
    def: new PDFPreviewButton(),
    ...componentConfig,
  };
}

// Source hash: d6f38c78182f4e9d54ef3912633a241c7e9d5f8f19961d160cbb558869276001
