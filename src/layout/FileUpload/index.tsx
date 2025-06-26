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
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class FileUpload extends FileUploadDef implements ValidateComponent<'FileUpload'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'FileUpload'>>(
    function LayoutComponentFileUploadRender(props, _): JSX.Element | null {
      return <FileUploadComponent {...props} />;
    },
  );

  renderDefaultValidations(): boolean {
    return false;
  }

  useDisplayData(nodeId: string): string {
    const attachments = useAttachmentsFor(nodeId);
    return attachments.map((a) => a.data.filename).join(', ');
  }

  evalExpressions(props: ExprResolver<'FileUpload'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnDelete: props.evalBool(props.item.alertOnDelete, false),
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

  useComponentValidation(node: LayoutNode<'FileUpload'>): ComponentValidation[] {
    return useValidateMinNumberOfAttachments(node);
  }

  isDataModelBindingsRequired(node: LayoutNode<'FileUpload'>): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    return !(node.parent instanceof LayoutPage) && node.parent.isType('RepeatingGroup');
  }

  useDataModelBindingValidation(node: LayoutNode<'FileUpload'>, bindings: IDataModelBindings<'FileUpload'>): string[] {
    return useFileUploaderDataBindingsValidation(node, bindings);
  }
}
