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
import type { IGridSize, IGridStyling } from 'src/layout/common.generated';

type ComponentStructureWrapperProps = {
  baseComponentId: string;
  label?: LabelProps;
  className?: string;
  style?: React.CSSProperties;
};

const toNumber = (grid: IGridSize | undefined): number | undefined => (typeof grid === 'number' ? grid : undefined);

function componentWithValidationSpan(
  innerGrid: IGridStyling | undefined,
  validationGrid: IGridStyling | undefined,
): { containerSpan: IGridStyling; innerSpan: IGridStyling; validationSpan: IGridStyling } {
  const containerSpan: IGridStyling = {};
  const innerSpan: IGridStyling = {};
  const validationSpan: IGridStyling = {};

  for (const breakpoints of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    const innerGridNumber = toNumber(innerGrid?.[breakpoints]);
    const validationGridNumber = toNumber(validationGrid?.[breakpoints]);
    if (innerGridNumber == null && validationGridNumber == null) {
      continue;
    }

    const maxWidth = Math.max(innerGridNumber ?? 0, validationGridNumber ?? 0);
    containerSpan[breakpoints] = maxWidth as IGridSize;
    innerSpan[breakpoints] =
      innerGridNumber != null ? (Math.round((innerGridNumber / maxWidth) * 12) as IGridSize) : 12;
    validationSpan[breakpoints] =
      validationGridNumber != null ? (Math.round((validationGridNumber / maxWidth) * 12) as IGridSize) : 12;
  }

  return { containerSpan, innerSpan, validationSpan };
}

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

  const { containerSpan, innerSpan, validationSpan } = componentWithValidationSpan(
    grid?.innerGrid,
    grid?.validationGrid,
  );

  const componentWithValidations = (
    <Flex
      id={`form-content-${indexedId}`}
      className={className}
      size={{ xs: 12, ...containerSpan }}
      item
      container
    >
      <Flex
        item
        size={{ xs: 12, ...innerSpan }}
        style={style}
      >
        {children}
      </Flex>
      {showValidationMessages && (
        <Flex
          item
          size={{ xs: 12, ...validationSpan }}
        >
          <AllComponentValidations baseComponentId={baseComponentId} />
        </Flex>
      )}
    </Flex>
  );

  return label ? <Label {...label}>{componentWithValidations}</Label> : componentWithValidations;
}
