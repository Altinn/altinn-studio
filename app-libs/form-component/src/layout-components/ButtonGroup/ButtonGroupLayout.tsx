import React from 'react';

import { Fieldset, Flex } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import type { IGridStyling } from '@app/form-component/app-components/Flex/Flex';

import classes from './ButtonGroupLayout.module.css';

export interface ButtonGroupLayoutProps {
  /** Component ID, used for test IDs */
  id?: string;
  /** Text resource key for the fieldset legend */
  title?: string;
  /** Text resource key for the description */
  description?: string;
  /** Text resource key for the help text */
  help?: string;
  /** Grid sizing for the fieldset label area */
  grid?: IGridStyling;
  /** Pre-rendered child button components */
  children?: React.ReactNode;
}

export function ButtonGroupLayout({
  id,
  title,
  description,
  help,
  grid,
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
      <Flex item container alignItems='center' className={classes.container}>
        {children}
      </Flex>
    </Fieldset>
  );
}
