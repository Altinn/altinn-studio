import React from 'react';

import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/Summary/AttachmentSummaryComponent';
import { getUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { FormComponent } from 'src/layout/LayoutComponent';
import { attachmentsValid } from 'src/utils/validation/validation';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { ComponentValidation, PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompFileUpload } from 'src/layout/FileUpload/types';
import type {
  IDataModelBindingsList,
  IDataModelBindingsSimple,
  TextBindingsForFormComponents,
} from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IValidationContext, IValidationObject } from 'src/utils/validation/types';

export class FileUpload extends FormComponent<'FileUpload'> implements ComponentValidation {
  render(props: PropsFromGenericComponent<'FileUpload'>): JSX.Element | null {
    return <FileUploadComponent {...props} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }

  getDisplayData(node: LayoutNodeFromType<'FileUpload'>, { formData, attachments }): string {
    return getUploaderSummaryData(node, formData, attachments)
      .map((a) => a.name)
      .join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'FileUpload'>): JSX.Element | null {
    return <AttachmentSummaryComponent targetNode={targetNode} />;
  }

  canRenderInTable(): boolean {
    return false;
  }

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): IValidationObject[] {
    return [];
  }

  runComponentValidation(
    node: LayoutNodeFromType<'FileUpload'>,
    { attachments, langTools }: IValidationContext,
    _overrideFormData?: IFormData,
  ): IValidationObject[] {
    if (!attachmentsValid(attachments, node.item)) {
      const message = `${langTools.langAsString('form_filler.file_uploader_validation_error_file_number_1')} ${
        node.item.minNumberOfAttachments
      } ${langTools.langAsString('form_filler.file_uploader_validation_error_file_number_2')}`;
      return [buildValidationObject(node, 'errors', message)];
    }
    return [];
  }
}

export const Config = {
  def: new FileUpload(),
  rendersWithLabel: true as const,
};

export type TypeConfig = {
  layout: ILayoutCompFileUpload;
  nodeItem: ExprResolved<ILayoutCompFileUpload>;
  nodeObj: LayoutNode;
  validTextResourceBindings: TextBindingsForFormComponents;
  validDataModelBindings: IDataModelBindingsSimple | IDataModelBindingsList;
};
