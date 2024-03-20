import React from 'react';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useText, useSelectedLayoutSetName, useSelectedLayoutName } from '../../hooks';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { LayoutSetsContainer } from './LayoutSetsContainer';

import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import classes from './Elements.module.css';

export const Elements = () => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSetName } = useSelectedLayoutSetName();
  const { selectedLayoutName } = useSelectedLayoutName();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSetName);
  const receiptName = formLayoutSettings?.receiptLayoutName;

  const hideComponents = selectedLayoutName === 'default' || selectedLayoutName === undefined;

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
      ) : receiptName === selectedLayoutName ? (
        <ConfPageToolbar />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};
