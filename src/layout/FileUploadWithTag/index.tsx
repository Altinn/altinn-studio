import React, { forwardRef, type JSX } from 'react';

import { useAttachmentsFor } from 'src/features/attachments/hooks';
import { AttachmentSummaryComponent2 } from 'src/layout/FileUpload/AttachmentSummaryComponent2';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { FileUploadLayoutValidator } from 'src/layout/FileUpload/FileUploadLayoutValidator';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { useValidateMinNumberOfAttachments } from 'src/layout/FileUpload/useValidateMinNumberOfAttachments';
import { useFileUploaderDataBindingsValidation } from 'src/layout/FileUpload/utils/useFileUploaderDataBindingsValidation';
import { FileUploadWithTagDef } from 'src/layout/FileUploadWithTag/config.def.generated';
import { useValidateMissingTag } from 'src/layout/FileUploadWithTag/useValidateMissingTag';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class FileUploadWithTag extends FileUploadWithTagDef implements ValidateComponent<'FileUploadWithTag'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'FileUploadWithTag'>>(
    function LayoutComponentFileUploadWithTagRender(props, _): JSX.Element | null {
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

  evalExpressions(props: ExprResolver<'FileUploadWithTag'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnDelete: props.evalBool(props.item.alertOnDelete, false),
    };
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  renderSummary2(props: Summary2Props<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentSummaryComponent2 targetNode={props.target} />;
  }

  renderLayoutValidators(props: NodeValidationProps<'FileUploadWithTag'>): JSX.Element | null {
    return <FileUploadLayoutValidator {...props} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  useEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  useComponentValidation(node: LayoutNode<'FileUploadWithTag'>): ComponentValidation[] {
    return [...useValidateMinNumberOfAttachments(node), ...useValidateMissingTag(node)];
  }

  isDataModelBindingsRequired(node: LayoutNode<'FileUploadWithTag'>): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    return !(node.parent instanceof LayoutPage) && node.parent.isType('RepeatingGroup');
  }

  useDataModelBindingValidation(
    node: LayoutNode<'FileUploadWithTag'>,
    bindings: IDataModelBindings<'FileUploadWithTag'>,
  ): string[] {
    return useFileUploaderDataBindingsValidation(node, bindings);
  }
}
