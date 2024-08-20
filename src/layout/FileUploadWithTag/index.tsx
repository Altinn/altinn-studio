import React, { forwardRef, type JSX } from 'react';

import { isAttachmentUploaded } from 'src/features/attachments';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { AttachmentSummaryComponent2 } from 'src/layout/FileUpload/AttachmentSummaryComponent2';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { FileUploadWithTagDef } from 'src/layout/FileUploadWithTag/config.def.generated';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { AttachmentValidation, ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
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

  getDisplayData(node: LayoutNode<'FileUploadWithTag'>, { attachmentsSelector }: DisplayDataProps): string {
    return attachmentsSelector(node)
      .map((a) => a.data.filename)
      .join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  renderSummary2(props: Summary2Props<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentSummaryComponent2 targetNode={props.target} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  runComponentValidation(
    node: LayoutNode<'FileUploadWithTag'>,
    { attachmentsSelector, nodeDataSelector }: ValidationDataSources,
  ): ComponentValidation[] {
    const validations: ComponentValidation[] = [];
    const minNumberOfAttachments = nodeDataSelector((picker) => picker(node)?.item?.minNumberOfAttachments, [node]);

    // Validate minNumberOfAttachments
    const attachments = attachmentsSelector(node);
    if (
      minNumberOfAttachments !== undefined &&
      minNumberOfAttachments > 0 &&
      attachments.length < minNumberOfAttachments
    ) {
      validations.push({
        message: {
          key: 'form_filler.file_uploader_validation_error_file_number',
          params: [minNumberOfAttachments],
        },
        severity: 'error',
        source: FrontendValidationSource.Component,
        // Treat visibility of minNumberOfAttachments the same as required to prevent showing an error immediately
        category: ValidationMask.Required,
      });
    }

    // Validate missing tags
    for (const attachment of attachments) {
      if (
        isAttachmentUploaded(attachment) &&
        (attachment.data.tags === undefined || attachment.data.tags.length === 0)
      ) {
        const tagKey = nodeDataSelector((picker) => picker(node)?.item?.textResourceBindings?.tagTitle, [node]);
        const tagReference = tagKey
          ? {
              key: tagKey,
              makeLowerCase: true,
            }
          : 'tag';

        const validation: AttachmentValidation = {
          message: {
            key: 'form_filler.file_uploader_validation_error_no_chosen_tag',
            params: [tagReference],
          },
          severity: 'error',
          source: FrontendValidationSource.Component,
          attachmentId: attachment.data.id,
          // Treat visibility of missing tag the same as required to prevent showing an error immediately
          category: ValidationMask.Required,
        };
        validations.push(validation);
      }
    }

    return validations;
  }

  isDataModelBindingsRequired(node: LayoutNode<'FileUploadWithTag'>): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    return !(node.parent instanceof LayoutPage) && node.parent.isType('RepeatingGroup');
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'FileUploadWithTag'>): string[] {
    const { node, item } = ctx;
    const { dataModelBindings } = item;
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
