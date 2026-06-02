import React, { forwardRef, type JSX } from 'react';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useAttachmentsFor } from 'src/features/attachments/hooks';
import { attachmentSelector, makeAttachmentNode } from 'src/features/attachments/tools';
import { RunOptionsEffects } from 'src/features/options/RunOptionsEffects';
import { AttachmentSummaryComponent2 } from 'src/layout/FileUpload/AttachmentSummaryComponent2';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { FileUploadLayoutValidator } from 'src/layout/FileUpload/FileUploadLayoutValidator';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { validateAttachmentDataElements } from 'src/layout/FileUpload/useValidateAttachmentDataElements';
import { validateMinNumberOfAttachmentsForNode } from 'src/layout/FileUpload/useValidateMinNumberOfAttachments';
import { useFileUploaderDataBindingsValidation } from 'src/layout/FileUpload/utils/useFileUploaderDataBindingsValidation';
import { FileUploadWithTagDef } from 'src/layout/FileUploadWithTag/config.def.generated';
import { validateMissingTagsForNode } from 'src/layout/FileUploadWithTag/useValidateMissingTag';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { AnyValidation, ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext, PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { IDataModelBindings, NodeValidationProps } from 'src/layout/layout';
import type { ExprResolver, NodeGeneratorProps, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class FileUploadWithTag extends FileUploadWithTagDef implements ValidateComponent<'FileUploadWithTag'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'FileUploadWithTag'>>(
    function LayoutComponentFileUploadWithTagRender(props, _): JSX.Element | null {
      return <FileUploadComponent {...props} />;
    },
  );

  extraNodeGeneratorChildren(_props: NodeGeneratorProps): JSX.Element | null {
    return <RunOptionsEffects valueType='single' />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  useDisplayData(baseComponentId: string): string {
    const attachments = useAttachmentsFor(baseComponentId);
    return attachments.map((a) => a.data.filename).join(', ');
  }

  evalExpressions(props: ExprResolver<'FileUploadWithTag'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnDelete: props.evalBool(props.item.alertOnDelete, false),
      maxNumberOfAttachments: props.evalNum(props.item.maxNumberOfAttachments, Infinity),
      minNumberOfAttachments: props.evalNum(props.item.minNumberOfAttachments, 0),
    };
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <AttachmentSummaryComponent {...props} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <AttachmentSummaryComponent2 {...props} />;
  }

  renderLayoutValidators(props: NodeValidationProps<'FileUploadWithTag'>): JSX.Element | null {
    return <FileUploadLayoutValidator {...props} />;
  }

  // This component does not use required-field validation; min attachments is handled as component validation.
  validateEmptyField(): ComponentValidation[] {
    return [];
  }

  validateComponent(ctx: ComponentValidationContext<'FileUploadWithTag'>): AnyValidation[] {
    const attachments = attachmentSelector(
      makeAttachmentNode(ctx.baseComponentId, ctx.component),
      ctx.formState,
      ctx.instanceData,
      getApplicationMetadata(),
      ctx.taskId,
    );
    return [
      ...validateMinNumberOfAttachmentsForNode(ctx),
      ...validateMissingTagsForNode(ctx),
      ...validateAttachmentDataElements(attachments, ctx.formState.validation.otherDataElementBackendValidations),
    ];
  }

  isDataModelBindingsRequired(baseComponentId: string, layoutLookups: LayoutLookups): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    const parentId = layoutLookups.componentToParent[baseComponentId];
    const parentLayout = parentId && parentId.type === 'node' ? layoutLookups.allComponents[parentId.id] : undefined;
    return parentLayout?.type === 'RepeatingGroup';
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'FileUploadWithTag'>): string[] {
    return useFileUploaderDataBindingsValidation(baseComponentId, bindings);
  }
}
