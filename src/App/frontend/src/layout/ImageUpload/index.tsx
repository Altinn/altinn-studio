import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useAttachmentsFor } from 'src/features/attachments/hooks';
import { useFileUploaderDataBindingsValidation } from 'src/layout/FileUpload/utils/useFileUploaderDataBindingsValidation';
import { ImageUploadDef } from 'src/layout/ImageUpload/config.def.generated';
import { ImageUploadComponent } from 'src/layout/ImageUpload/ImageUploadComponent';
import { ImageUploadSummary2 } from 'src/layout/ImageUpload/ImageUploadSummary2/ImageUploadSummary2';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class ImageUpload extends ImageUploadDef {
  useDisplayData(baseComponentId: string): string {
    const attachments = useAttachmentsFor(baseComponentId);
    return attachments.map((a) => a.data.filename).join(', ');
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'ImageUpload'>>(
    function LayoutComponentImageUploadRender(props, _): JSX.Element | null {
      return <ImageUploadComponent {...props} />;
    },
  );

  isDataModelBindingsRequired(baseComponentId: string, layoutLookups: LayoutLookups): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    const parentId = layoutLookups.componentToParent[baseComponentId];
    const parentLayout = parentId && parentId.type === 'node' ? layoutLookups.allComponents[parentId.id] : undefined;
    return parentLayout?.type === 'RepeatingGroup';
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'ImageUpload'>): string[] {
    return useFileUploaderDataBindingsValidation(baseComponentId, bindings);
  }

  renderSummary(_props: SummaryRendererProps): JSX.Element | null {
    throw new Error('ImageUpload is not supported in Summary; use Summary2 instead.');
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <ImageUploadSummary2 {...props} />;
  }

  evalExpressions(props: ExprResolver<'ImageUpload'>) {
    return {
      ...this.evalDefaultExpressions(props),
    };
  }
}
