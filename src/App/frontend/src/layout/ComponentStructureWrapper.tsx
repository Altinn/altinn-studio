import React from 'react';
import type { PropsWithChildren } from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/components/label/Label';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { getComponentDef } from 'src/layout/index';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { LabelProps } from 'src/components/label/Label';

type ComponentStructureWrapperProps = {
  baseComponentId: string;
  label?: LabelProps;
  className?: string;
  style?: React.CSSProperties;
};

export function ComponentStructureWrapper({
  baseComponentId,
  children,
  label,
  className,
  style,
}: PropsWithChildren<ComponentStructureWrapperProps>) {
  const overrideItemProps = useFormComponentCtx()?.overrideItemProps;
  const component = useExternalItem(baseComponentId);
  const grid = overrideItemProps?.grid ?? component?.grid;
  const layoutComponent = getComponentDef(component.type);
  const showValidationMessages = layoutComponent.renderDefaultValidations();
  const indexedId = useIndexedId(baseComponentId);

  const componentWithValidations = (
    <Flex
      id={`form-content-${indexedId}`}
      className={className}
      size={{ xs: 12, ...grid?.innerGrid }}
      style={style}
      item
    >
      {children}
      {showValidationMessages && <AllComponentValidations baseComponentId={baseComponentId} />}
    </Flex>
  );

  return label ? <Label {...label}>{componentWithValidations}</Label> : componentWithValidations;
}
