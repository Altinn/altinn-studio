import React from 'react';
import type { ReactNode } from 'react';

import { Fieldset, Flex } from '../../app-components';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import { Description } from '../common/Description';
import { HelpTextContainer } from '../common/HelpTextContainer';
import classes from './ButtonGroupLayout.module.css';
import type { IGridStyling } from '../../app-components/Flex/Flex';

export interface ButtonGroupLayoutProps {
  /** Component ID, used for test IDs */
  id?: string;
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
  id,
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

  const legendNode = title ? <>{lang(title)}</> : undefined;

  const descriptionNode = description ? (
    <Description componentId={id} description={lang(description)} />
  ) : undefined;

  const helpNode = help ? (
    <HelpTextContainer id={id} title={langAsString(title)} helpText={lang(help)} />
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
