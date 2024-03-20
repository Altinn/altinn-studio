import React from 'react';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useText } from '../../hooks';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { LayoutSetsContainer } from './LayoutSetsContainer';

import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import classes from './Elements.module.css';
import { useAppContext } from '../../hooks/useAppContext';
import { useSelectedLayoutName } from '../../hooks/useSelectedLayoutName';

export const Elements = () => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { selectedLayoutName } = useSelectedLayoutName();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
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
