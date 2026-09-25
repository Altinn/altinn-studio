import React from 'react';

import { Link as LinkLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import type { PropsFromGenericComponent } from '..';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

export function LinkComponent({ baseComponentId }: PropsFromGenericComponent<'Link'>) {
  const config = useComponentConfig(baseComponentId, 'Link');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Link.textResourceBindings.title);
  const target = useEvalOptionalText(config.textResourceBindings?.target, Expressions.Link.textResourceBindings.target);
  const download = useEvalOptionalText(
    config.textResourceBindings?.download,
    Expressions.Link.textResourceBindings.download,
  );

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  return (
    <LinkLayout
      componentId={componentId}
      style={config.style}
      title={title}
      target={target}
      download={download}
      openInNewTab={config.openInNewTab}
      size={config.size}
      fullWidth={config.fullWidth}
      textAlign={config.textAlign}
      position={config.position}
      innerGrid={innerGrid}
    />
  );
}
