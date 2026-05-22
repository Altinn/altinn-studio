import { attachmentSelector } from 'src/features/attachments/tools';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { type ComponentValidation, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';

export function validateRequiredImageUpload(required: boolean, attachmentsCount: number): ComponentValidation[] {
  if (!required || attachmentsCount > 0) {
    return [];
  }

  return [
    {
      message: {
        key: 'image_upload_component.error_required',
      },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Required,
    },
  ];
}

export function validateRequiredImageUploadForNode(
  ctx: ComponentValidationContext<'ImageUpload'>,
): ComponentValidation[] {
  return validateRequiredImageUpload(
    evalExpr(ctx.component.required, ctx.expressionDataSources, {
      returnType: ExprVal.Boolean,
      defaultValue: false,
    }),
    attachmentSelector(ctx.component.id)(ctx.formState).length,
  );
}
