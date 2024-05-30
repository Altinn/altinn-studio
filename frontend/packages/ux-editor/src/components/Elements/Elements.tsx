import React from 'react';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useText, useAppContext } from '../../hooks';
import { LayoutSetsContainer } from './LayoutSetsContainer';

import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './Elements.module.css';

import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useProcessTaskTypeQuery } from '../../hooks/queries/useProcessTaskTypeQuery';

export const Elements = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: processTaskType } = useProcessTaskTypeQuery(org, app, selectedFormLayoutSetName);
  const existingCustomReceiptName: string | undefined = useCustomReceiptLayoutSetName(org, app);

  const hideComponents =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  const t = useText();

  const shouldShowConfPageToolbar = () => {
    return existingCustomReceiptName === selectedFormLayoutSetName || processTaskType === 'payment';
  };

  const confPageToolbarMode = () => {
    return existingCustomReceiptName === selectedFormLayoutSetName ? 'receipt' : 'payment';
  };

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
      ) : shouldShowConfPageToolbar() ? (
        <ConfPageToolbar confPageType={confPageToolbarMode()} />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};
