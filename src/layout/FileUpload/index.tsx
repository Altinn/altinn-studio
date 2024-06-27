import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { AttachmentSummaryComponent2 } from 'src/layout/FileUpload/AttachmentSummaryComponent2';
import { FileUploadDef } from 'src/layout/FileUpload/config.def.generated';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class FileUpload extends FileUploadDef implements ValidateComponent {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'FileUpload'>>(
    function LayoutComponentFileUploadRender(props, _): JSX.Element | null {
      return <FileUploadComponent {...props} />;
    },
  );

  renderDefaultValidations(): boolean {
    return false;
  }

  getDisplayData(node: LayoutNode<'FileUpload'>, { attachments }: DisplayDataProps): string {
    return (attachments[node.item.id] || []).map((a) => a.data.filename).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUpload'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  renderSummary2(componentNode: LayoutNode<'FileUpload'>): JSX.Element | null {
    return <AttachmentSummaryComponent2 targetNode={componentNode} />;
  }

  shouldRenderInAutomaticPDF() {
    return true;
  }

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  runComponentValidation(
    node: LayoutNode<'FileUpload'>,
    { attachments }: ValidationDataSources,
  ): ComponentValidation[] {
    const validations: ComponentValidation[] = [];

    // Validate minNumberOfAttachments
    if (
      node.item.minNumberOfAttachments > 0 &&
      (!attachments[node.item.id] || attachments[node.item.id]!.length < node.item.minNumberOfAttachments)
    ) {
      validations.push({
        message: {
          key: 'form_filler.file_uploader_validation_error_file_number',
          params: [node.item.minNumberOfAttachments],
        },
        severity: 'error',
        source: FrontendValidationSource.Component,
        componentId: node.item.id,
        // Treat visibility of minNumberOfAttachments the same as required to prevent showing an error immediately
        category: ValidationMask.Required,
      });
    }

    return validations;
  }

  isDataModelBindingsRequired(node: LayoutNode<'FileUpload'>): boolean {
    // Data model bindings are only required when the component is defined inside a repeating group
    return !(node.parent instanceof LayoutPage) && node.parent.isType('RepeatingGroup');
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'FileUpload'>): string[] {
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
