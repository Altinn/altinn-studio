import React from 'react';
import type { PropsWithChildren } from 'react';

import { Grid } from '@material-ui/core';

import { Label } from 'src/components/label/Label';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { gridBreakpoints } from 'src/utils/formComponentUtils';
import type { LabelProps } from 'src/components/label/Label';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ComponentStructureWrapperProps<Type extends CompTypes> = {
  node: LayoutNode<Type>;
  label?: LabelProps;
};

export function ComponentStructureWrapper<Type extends CompTypes = CompTypes>({
  node,
  children,
  label,
}: PropsWithChildren<ComponentStructureWrapperProps<Type>>) {
  const overrideItemProps = useFormComponentCtx()?.overrideItemProps;

  const item = overrideItemProps ? { ...node.item, ...overrideItemProps } : { ...node.item };
  const labelProps = label && overrideItemProps ? ({ ...label, ...overrideItemProps } as LabelProps) : label;
  const layoutComponent = node.def as unknown as LayoutComponent<Type>;

  const validations = useUnifiedValidationsForNode(node);

  // If maxLength is set in both schema and component, don't display the schema error message
  const maxLength = 'maxLength' in node.item && node.item.maxLength;
  const filteredValidationErrors = maxLength
    ? validations.filter(
        (validation) =>
          !(validation.message.key === 'validation_errors.maxLength' && validation.message.params?.at(0) === maxLength),
      )
    : validations;

  const showValidationMessages = layoutComponent.renderDefaultValidations();

  const componentWithValidations = (
    <Grid
      item
      id={`form-content-${item.id}`}
      {...gridBreakpoints(item.grid?.innerGrid)}
    >
      {children}
      {showValidationMessages && (
        <ComponentValidations
          validations={filteredValidationErrors}
          node={node}
        />
      )}
    </Grid>
  );

  return labelProps ? <Label {...labelProps}>{componentWithValidations}</Label> : componentWithValidations;
}
