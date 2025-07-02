import React from 'react';
import type { PropsWithChildren } from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/components/label/Label';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { LabelProps } from 'src/components/label/Label';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ComponentStructureWrapperProps<Type extends CompTypes> = {
  node: LayoutNode<Type>;
  label?: LabelProps;
  className?: string;
  style?: React.CSSProperties;
};

export function ComponentStructureWrapper<Type extends CompTypes = CompTypes>({
  node,
  children,
  label,
  className,
  style,
}: PropsWithChildren<ComponentStructureWrapperProps<Type>>) {
  const overrideItemProps = useFormComponentCtx()?.overrideItemProps;
  const component = useExternalItem(node.baseId);
  const grid = overrideItemProps?.grid ?? component?.grid;
  const layoutComponent = node.def;
  const showValidationMessages = layoutComponent.renderDefaultValidations();

  const componentWithValidations = (
    <Flex
      id={`form-content-${node.id}`}
      className={className}
      size={{ xs: 12, ...grid?.innerGrid }}
      style={style}
      item
    >
      {children}
      {showValidationMessages && <AllComponentValidations baseComponentId={node.baseId} />}
    </Flex>
  );

  return label ? <Label {...label}>{componentWithValidations}</Label> : componentWithValidations;
}
