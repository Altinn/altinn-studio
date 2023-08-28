import React from 'react';

import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { getUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { FileUploadWithTagDef } from 'src/layout/FileUploadWithTag/config.def.generated';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import { attachmentIsMissingTag, attachmentsValid } from 'src/utils/validation/validation';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { IFormData } from 'src/features/formData';
import type { ComponentValidation, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IValidationContext, IValidationObject } from 'src/utils/validation/types';

export class FileUploadWithTag extends FileUploadWithTagDef implements ComponentValidation {
  render(props: PropsFromGenericComponent<'FileUploadWithTag'>): JSX.Element | null {
    return <FileUploadComponent {...props} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  getDisplayData(node: LayoutNode<'FileUploadWithTag'>, { formData, attachments }): string {
    return getUploaderSummaryData(node, formData, attachments)
      .map((a) => a.name)
      .join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUploadWithTag'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): IValidationObject[] {
    return [];
  }

  runComponentValidation(
    node: LayoutNode<'FileUploadWithTag'>,
    { attachments, langTools }: IValidationContext,
    _overrideFormData?: IFormData,
  ): IValidationObject[] {
    const validations: IValidationObject[] = [];
    if (attachmentsValid(attachments, node.item)) {
      const missingTagAttachments = attachments[node.item.id]
        ?.filter((attachment) => attachmentIsMissingTag(attachment))
        .map((attachment) => attachment.id);

      if (missingTagAttachments?.length > 0) {
        missingTagAttachments.forEach((missingId) => {
          const message = `${
            missingId +
            AsciiUnitSeparator +
            langTools.langAsString('form_filler.file_uploader_validation_error_no_chosen_tag')
          } ${(node.item.textResourceBindings?.tagTitle || '').toLowerCase()}.`;
          validations.push(buildValidationObject(node, 'errors', message));
        });
      }
    } else {
      const message = `${langTools.langAsString('form_filler.file_uploader_validation_error_file_number_1')} ${
        node.item.minNumberOfAttachments
      } ${langTools.langAsString('form_filler.file_uploader_validation_error_file_number_2')}`;
      validations.push(buildValidationObject(node, 'errors', message));
    }
    return validations;
  }
}
