import { attachmentSelector } from 'src/features/attachments/tools';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';

export function validateMinNumberOfAttachments(
  minNumberOfAttachments: number,
  attachmentsCount = 0,
): ComponentValidation | undefined {
  if (minNumberOfAttachments <= 0 || attachmentsCount >= minNumberOfAttachments) {
    return undefined;
  }

  return {
    message: {
      key: 'form_filler.file_uploader_validation_error_file_number',
      params: [minNumberOfAttachments],
    },
    severity: 'error',
    source: FrontendValidationSource.Component,
    // Treat visibility of minNumberOfAttachments the same as required to prevent showing an error immediately
    category: ValidationMask.Required,
  };
}

export function validateMinNumberOfAttachmentsForNode<T extends 'FileUpload' | 'FileUploadWithTag'>(
  ctx: ComponentValidationContext<T>,
): ComponentValidation[] {
  const component = ctx.component as { id: string; minNumberOfAttachments?: unknown };
  const minNumberOfAttachments = evalExpr(component.minNumberOfAttachments as never, ctx.expressionDataSources, {
    returnType: ExprVal.Number,
    defaultValue: 0,
  }) as number;
  const attachments = attachmentSelector(component.id)(ctx.formState);
  return [validateMinNumberOfAttachments(minNumberOfAttachments, attachments.length)].filter(
    (validation): validation is ComponentValidation => !!validation,
  );
}
