import React from 'react';
import { useSelector } from 'react-redux';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useText } from '../../hooks';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from './LayoutSetsContainer';

import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import classes from './Elements.module.css';
import { useAppContext } from '../../hooks/useAppContext';

export const Elements = () => {
  const { org, app } = useStudioUrlParams();
  const selectedLayout: string = useSelector(selectedLayoutNameSelector);
  const { selectedLayoutSet } = useAppContext();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const receiptName = formLayoutSettings?.receiptLayoutName;
  const layoutSetNames = layoutSetsQuery?.data?.sets;

  const hideComponents = selectedLayout === 'default' || selectedLayout === undefined;

  const t = useText();

  return (
    <div className={classes.root}>
      {layoutSetNames && <LayoutSetsContainer />}
      <Heading size='xxsmall' className={classes.componentsHeader}>
        {t('left_menu.components')}
      </Heading>
      {hideComponents ? (
        <Paragraph className={classes.noPageSelected} size='small'>
          {t('left_menu.no_components_selected')}
        </Paragraph>
      ) : receiptName === selectedLayout ? (
        <ConfPageToolbar />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};
