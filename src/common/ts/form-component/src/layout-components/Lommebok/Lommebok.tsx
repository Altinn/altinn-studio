import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelAsSpan } from '@app/form-component/layout-components/common/LabelAsSpan';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

export interface LommebokProps {
  componentId: string;
  title?: string;
  description?: string;
  help?: string;
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
}

export function Lommebok({
  componentId,
  title,
  description,
  help,
  labelGrid,
  innerGrid,
}: LommebokProps) {
  // Static placeholder text until this component gets a data model binding.
  const content = (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      Lommebok
    </ComponentStructure>
  );

  if (!title) {
    return content;
  }

  return (
    <LabelAsSpan
      componentId={componentId}
      title={title}
      description={description}
      help={help}
      labelGrid={labelGrid}
    >
      {content}
    </LabelAsSpan>
  );
}
