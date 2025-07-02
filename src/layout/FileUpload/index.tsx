import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useAttachmentsFor } from 'src/features/attachments/hooks';
import { AttachmentSummaryComponent2 } from 'src/layout/FileUpload/AttachmentSummaryComponent2';
import { FileUploadDef } from 'src/layout/FileUpload/config.def.generated';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { FileUploadLayoutValidator } from 'src/layout/FileUpload/FileUploadLayoutValidator';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { useValidateMinNumberOfAttachments } from 'src/layout/FileUpload/useValidateMinNumberOfAttachments';
import { useFileUploaderDataBindingsValidation } from 'src/layout/FileUpload/utils/useFileUploaderDataBindingsValidation';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class FileUpload extends FileUploadDef implements ValidateComponent {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'FileUpload'>>(
    function LayoutComponentFileUploadRender(props, _): JSX.Element | null {
      return <FileUploadComponent {...props} />;
    },
  );

  renderDefaultValidations(): boolean {
    return false;
  }

  useDisplayData(baseComponentId: string): string {
    const attachments = useAttachmentsFor(baseComponentId);
    return attachments.map((a) => a.data.filename).join(', ');
  }

  evalExpressions(props: ExprResolver<'FileUpload'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnDelete: props.evalBool(props.item.alertOnDelete, false),
      maxNumberOfAttachments: props.evalNum(props.item.maxNumberOfAttachments, Infinity),
      minNumberOfAttachments: props.evalNum(props.item.minNumberOfAttachments, 0),
    };
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUpload'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  renderSummary2(props: Summary2Props<'FileUpload'>): JSX.Element | null {
    return <AttachmentSummaryComponent2 targetNode={props.target} />;
  }

  shouldRenderInAutomaticPDF() {
    return true;
  }

  renderLayoutValidators(props: NodeValidationProps<'FileUpload'>): JSX.Element | null {
    return <FileUploadLayoutValidator {...props} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  useEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  useComponentValidation(baseComponentId: string): ComponentValidation[] {
    return useValidateMinNumberOfAttachments(baseComponentId);
  }

  isDataModelBindingsRequired(baseComponentId: string, layoutLookups: LayoutLookups): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    const parentId = layoutLookups.componentToParent[baseComponentId];
    const parentLayout = parentId && parentId.type === 'node' ? layoutLookups.allComponents[parentId.id] : undefined;
    return parentLayout?.type === 'RepeatingGroup';
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'FileUpload'>): string[] {
    return useFileUploaderDataBindingsValidation(baseComponentId, bindings);
  }
}
