import React from 'react';

import { HelpText } from '@digdir/designsystemet-react';

import { Description } from 'src/components/form/Description';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { GenericComponentOverrideDisplay } from 'src/layout/FormComponentContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useLabel({
  node,
  overrideDisplay,
}: {
  node: LayoutNode;
  overrideDisplay: GenericComponentOverrideDisplay | undefined;
}) {
  const item = useNodeItem(node);
  const { readOnly, required, showOptionalMarking, textResourceBindings } = {
    readOnly: item['readOnly'],
    required: item['required'],
    showOptionalMarking: !!item['labelSettings']?.['optionalIndicator'],
    textResourceBindings: {
      title: item.textResourceBindings?.['title'],
      help: item.textResourceBindings?.['help'],
      description: item.textResourceBindings?.['description'],
    },
  };

  const { langAsString } = useLanguage();
  const { title, help, description } = textResourceBindings ?? {};

  const shouldShowLabel = (overrideDisplay?.renderLabel ?? true) && overrideDisplay?.renderedInTable !== true;
  const labelText = shouldShowLabel ? langAsString(textResourceBindings?.title) : undefined;

  const getRequiredComponent = () => (required ? <RequiredIndicator required={required} /> : undefined);
  const getOptionalComponent = () =>
    !required ? (
      <OptionalIndicator
        readOnly={readOnly}
        required={required}
        showOptionalMarking={showOptionalMarking}
      />
    ) : undefined;

  const getHelpTextComponent = () =>
    help ? (
      <HelpText
        id={`${title}-helptext`}
        title={`${langAsString('helptext.button_title_prefix')} ${langAsString(title)}`}
      >
        <Lang id={help} />
      </HelpText>
    ) : undefined;

  const getDescriptionComponent = () =>
    description ? (
      <Description
        componentId={node.id}
        description={<Lang id={description} />}
      />
    ) : undefined;

  return {
    labelText,
    getRequiredComponent,
    getOptionalComponent,
    getHelpTextComponent,
    getDescriptionComponent,
  };
}
