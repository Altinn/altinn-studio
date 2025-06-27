import { CG } from 'src/codegen/CG';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { IAttachment, IFailedAttachment } from 'src/features/attachments/index';
import type { CompTypes } from 'src/layout/layout';
import type { DefPluginStateFactoryProps } from 'src/utils/layout/plugins/NodeDefPlugin';

interface Config {
  componentType: CompTypes;
  extraState: {
    attachments: Record<string, IAttachment>;
    attachmentsFailedToUpload: Record<string, IFailedAttachment>; // Maps temporary attachment ID to error message
  };
}

export class AttachmentsPlugin extends NodeDefPlugin<Config> {
  addToComponent(component: ComponentConfig): void {
    if (!component.isFormLike()) {
      throw new Error('AttachmentsPlugin can only be used with container or form components');
    }

    component.behaviors.canHaveAttachments = true;
  }

  makeImport() {
    return new CG.import({
      import: 'AttachmentsPlugin',
      from: 'src/features/attachments/AttachmentsPlugin',
    });
  }

  getKey(): string {
    return 'AttachmentsPlugin';
  }

  stateFactory(_props: DefPluginStateFactoryProps): Config['extraState'] {
    return {
      attachments: {},
      attachmentsFailedToUpload: {},
    };
  }

  extraNodeGeneratorChildren(): string {
    const StoreAttachmentsInNode = new CG.import({
      import: 'StoreAttachmentsInNode',
      from: 'src/features/attachments/StoreAttachmentsInNode',
    });

    return `<${StoreAttachmentsInNode} />`;
  }
}
