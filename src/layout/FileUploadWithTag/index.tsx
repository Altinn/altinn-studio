import React from 'react';

import { isAttachmentUploaded } from 'src/features/attachments';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { attachmentIsMissingTag, attachmentsValid } from 'src/features/validation/utils';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { FileUploadWithTagDef } from 'src/layout/FileUploadWithTag/config.def.generated';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { DisplayDataProps, PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class FileUploadWithTag extends FileUploadWithTagDef implements ValidateComponent {
  render = (props: PropsFromGenericComponent<'FileUploadWithTag'>): JSX.Element | null => (
    <FileUploadComponent {...props} />
  );

  renderDefaultValidations(): boolean {
    return false;
  }

  getDisplayData(node: LayoutNode<'FileUploadWithTag'>, { attachments }: DisplayDataProps): string {
    return (attachments[node.item.id] || []).map((a) => a.data.filename).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  runComponentValidation(
    node: LayoutNode<'FileUploadWithTag'>,
    { attachments }: ValidationDataSources,
  ): ComponentValidation[] {
    const validations: ComponentValidation[] = [];

    if (attachmentsValid(attachments, node.item)) {
      const missingTagAttachmentIds: string[] = [];
      for (const attachment of attachments[node.item.id] || []) {
        if (isAttachmentUploaded(attachment) && attachmentIsMissingTag(attachment)) {
          missingTagAttachmentIds.push(attachment.data.id);
        }
      }

      if (missingTagAttachmentIds?.length > 0) {
        missingTagAttachmentIds.forEach((attachmentId) => {
          const tagKey = node.item.textResourceBindings?.tagTitle;
          const tagReference = tagKey
            ? {
                key: tagKey,
                makeLowerCase: true,
              }
            : 'tag';

          validations.push({
            message: {
              key: 'form_filler.file_uploader_validation_error_no_chosen_tag',
              params: [tagReference],
            },
            severity: 'error',
            componentId: node.item.id,
            source: FrontendValidationSource.Component,
            meta: { attachmentId },
            category: ValidationMask.Component,
          });
        });
      }
    } else {
      validations.push({
        message: {
          key: 'form_filler.file_uploader_validation_error_file_number',
          params: [node.item.minNumberOfAttachments],
        },
        severity: 'error',
        componentId: node.item.id,
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }
    return validations;
  }

  isDataModelBindingsRequired(node: LayoutNode<'FileUploadWithTag'>): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    return !(node.parent instanceof LayoutPage) && node.parent.isType('RepeatingGroup');
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'FileUploadWithTag'>): string[] {
    const { node } = ctx;
    const { dataModelBindings } = node.item;
    const isRequired = this.isDataModelBindingsRequired(node);
    const hasBinding = dataModelBindings && ('simpleBinding' in dataModelBindings || 'list' in dataModelBindings);

    if (!isRequired && !hasBinding) {
      return [];
    }
    if (isRequired && !hasBinding) {
      return [
        `En simpleBinding, eller list-datamodellbinding, er påkrevd for denne komponenten når den brukes ` +
          `i en repeterende gruppe, men dette mangler i layout-konfigurasjonen.`,
      ];
    }

    const simpleBinding =
      dataModelBindings && 'simpleBinding' in dataModelBindings ? dataModelBindings.simpleBinding : undefined;
    const listBinding = dataModelBindings && 'list' in dataModelBindings ? dataModelBindings.list : undefined;

    if (simpleBinding) {
      return this.validateDataModelBindingsSimple(ctx);
    }

    if (listBinding) {
      return this.validateDataModelBindingsList(ctx);
    }

    return [];
  }
}
