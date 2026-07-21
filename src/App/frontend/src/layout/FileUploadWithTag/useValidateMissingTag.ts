import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { isAttachmentUploaded } from 'src/features/attachments';
import { attachmentSelector, makeAttachmentNode } from 'src/features/attachments/tools';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { IAttachment } from 'src/features/attachments';
import type { AttachmentValidation, ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';

export function validateMissingTags(attachments: IAttachment[], tagKey: string | undefined): ComponentValidation[] {
  const validations: ComponentValidation[] = [];

  for (const attachment of attachments) {
    if (isAttachmentUploaded(attachment) && (attachment.data.tags === undefined || attachment.data.tags.length === 0)) {
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

export function validateMissingTagsForNode(
  ctx: ComponentValidationContext<'FileUploadWithTag'>,
): ComponentValidation[] {
  return validateMissingTags(
    attachmentSelector(
      makeAttachmentNode(ctx.baseComponentId, ctx.component),
      ctx.formState,
      ctx.instanceData,
      getApplicationMetadata(),
      ctx.taskId,
    ),
    evalExpr(ctx.component.textResourceBindings?.tagTitle, ctx.expressionDataSources, {
      returnType: ExprVal.String,
      defaultValue: '',
    }),
  );
}
