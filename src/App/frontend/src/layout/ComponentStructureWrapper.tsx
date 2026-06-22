import React from 'react';
import type { PropsWithChildren } from 'react';

import { ComponentStructure } from '@app/form-component';

import { Label } from 'src/components/label/Label';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
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
  const { id, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  const componentWithValidations = (
    <ComponentStructure
      id={id}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      className={className}
      contentStyle={style}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    >
      {children}
    </ComponentStructure>
  );

  return label ? <Label {...label}>{componentWithValidations}</Label> : componentWithValidations;
}
