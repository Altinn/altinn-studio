import React, { type JSX, type PropsWithChildren, type ReactElement } from 'react';

import { Flex } from '@app/form-component/app-components/Flex/Flex';
import {
  Fieldset as DesignsystemetFieldset,
  Label as DesignsystemetLabel,
} from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex/Flex';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import labelClasses from './Label.module.css';

export type FieldsetProps = {
  id?: string;
  legend: string | ReactElement | undefined;
  legendSize?: Extract<DesignsystemetLabelProps['data-size'], 'sm' | 'md' | 'lg' | 'xl'>;
  className?: string;
  grid?: IGridStyling;
  optionalIndicator?: ReactElement;
  help?: ReactElement;
  description?: ReactElement;
  required?: boolean;
  requiredIndicator?: JSX.Element;
  style?: DesignsystemetLabelProps['style'];
  size?: Extract<DesignsystemetLabelProps['data-size'], 'sm' | 'md' | 'lg' | 'xl'>;
};

export function Fieldset({
  id,
  children,
  className,
  legend,
  legendSize = 'md',
  grid,
  style,
  help,
  description,
  required,
  requiredIndicator,
  size = 'md',
  optionalIndicator,
}: PropsWithChildren<FieldsetProps>) {
  const generatedId = React.useId();
  const baseId = id ?? `fieldset-${generatedId}`;
  const legendId = `${baseId}-legend`;
  const descriptionId = `${baseId}-description`;

  if (!legend) {
    return (
      <Flex id={id} container spacing={2}>
        <Flex item size={grid ?? { xs: 12 }} className={className}>
          {children}
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex id={id} container spacing={2}>
      <Flex item size={grid ?? { xs: 12 }}>
        <DesignsystemetFieldset
          className={cn(className)}
          data-size={size}
          aria-labelledby={`${legendId} ${descriptionId}`}
        >
          <DesignsystemetFieldset.Legend id={legendId} className={labelClasses.legend}>
            <span className={cn(labelClasses.labelAndHelpWrapper)}>
              <DesignsystemetLabel weight='medium' data-size={legendSize} style={style} asChild>
                <span>
                  {legend}
                  {required && requiredIndicator}
                  {!required && optionalIndicator}
                </span>
              </DesignsystemetLabel>
              {help}
            </span>
          </DesignsystemetFieldset.Legend>
          <DesignsystemetFieldset.Description id={descriptionId}>
            {description}
          </DesignsystemetFieldset.Description>
          {children}
        </DesignsystemetFieldset>
      </Flex>
    </Flex>
  );
}
