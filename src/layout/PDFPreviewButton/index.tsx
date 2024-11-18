import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { PDFPreviewButtonDef } from 'src/layout/PDFPreviewButton/config.def.generated';
import {
  PDFPreviewButtonComponent,
  PDFPreviewButtonRenderLayoutValidator,
} from 'src/layout/PDFPreviewButton/PDFPreviewButtonComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';

export class PDFPreviewButton extends PDFPreviewButtonDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'PDFPreviewButton'>>(
    function LayoutComponentActionButtonRender(props, _): JSX.Element | null {
      return <PDFPreviewButtonComponent {...props} />;
    },
  );

  renderLayoutValidators(props: NodeValidationProps<'PDFPreviewButton'>): JSX.Element | null {
    return <PDFPreviewButtonRenderLayoutValidator {...props} />;
  }
}
