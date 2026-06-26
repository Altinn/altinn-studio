import React from 'react';
import type { ReactNode } from 'react';

import { Fieldset, Flex } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import type { IGridStyling } from '@app/form-component/app-components/Flex/Flex';

import classes from './ButtonGroupLayout.module.css';

export interface ButtonGroupLayoutProps {
  /** The indexed component ID used for form-content wrapper */
  componentId?: string;
  /** Text resource key for the fieldset legend */
  title?: string;
  /** Text resource key for the description */
  description?: string;
  /** Text resource key for the help text */
  help?: string;
  /** Grid sizing for the fieldset label area */
  grid?: IGridStyling;
  /** Grid sizing for the inner content area */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages */
  validationGrid?: IGridStyling;
  /** Rendered validation messages */
  validationMessages?: ReactNode;
  /** Pre-rendered child button components */
  children?: React.ReactNode;
}

export function ButtonGroupLayout({
  componentId,
  title,
  description,
  help,
  grid,
  innerGrid,
  validationGrid,
  validationMessages,
  children,
}: ButtonGroupLayoutProps) {
  const { lang, langAsString } = useTranslation();

  const legendNode = title ? lang(title) : undefined;

  const descriptionNode = description ? (
    <Description componentId={componentId} description={lang(description)} />
  ) : undefined;

  const helpNode = help ? (
    <HelpTextContainer id={componentId} title={langAsString(title)} helpText={lang(help)} />
  ) : undefined;

  return (
    <Fieldset grid={grid} legend={legendNode} description={descriptionNode} help={helpNode}>
      <ComponentStructure
        componentId={componentId}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={validationMessages}
      >
        <Flex item container alignItems='center' className={classes.container}>
          {children}
        </Flex>
      </ComponentStructure>
    </Fieldset>
  );
}
