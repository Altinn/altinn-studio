import type { ComponentConfig } from 'src/codegen/ComponentConfig';

export function asAttachmentUploader(config: ComponentConfig): ComponentConfig {
  if (!config.isFormLike()) {
    throw new Error('Attachment uploaders must be container or form components');
  }

  config.behaviors.canHaveAttachments = true;
  return config;
}
