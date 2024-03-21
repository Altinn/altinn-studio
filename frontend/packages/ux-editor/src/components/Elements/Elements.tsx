import React from 'react';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useText, useAppContext, useSelectedFormLayoutName } from '../../hooks';
import { LayoutSetsContainer } from './LayoutSetsContainer';

import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import classes from './Elements.module.css';

import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';

export const Elements = () => {
  const { org, app } = useStudioUrlParams();
  const { selectedFormLayoutName } = useSelectedFormLayoutName();
  const { selectedFormLayoutSetName } = useAppContext();
  const existingCustomReceiptName: string | undefined = useCustomReceiptLayoutSetName(org, app);

  const hideComponents =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  const t = useText();

  return (
    <div className={classes.root}>
      <LayoutSetsContainer />
      <Heading size='xxsmall' className={classes.componentsHeader}>
        {t('left_menu.components')}
      </Heading>
      {hideComponents ? (
        <Paragraph className={classes.noPageSelected} size='small'>
          {t('left_menu.no_components_selected')}
        </Paragraph>
      ) : existingCustomReceiptName === selectedFormLayoutSetName ? (
        <ConfPageToolbar />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};
