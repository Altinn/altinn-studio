import React from 'react';
import { useSelector } from 'react-redux';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { Heading, Paragraph, Accordion } from '@digdir/design-system-react';
import { useText } from '../../hooks';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useLayoutSetsQuery } from '../../hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import { ConfigureLayoutSetPanel } from './ConfigureLayoutSetPanel';

import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
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
      {shouldDisplayFeature('configureLayoutSet') && layoutSetNames ? (
        <ConfigureLayoutSetPanel />
      ) : (
        <LayoutSetsContainer />
      )}
      <Accordion color='subtle'>
        {shouldDisplayFeature('configureLayoutSet') && (
          <Accordion.Item defaultOpen={layoutSetNames?.length > 0}>
            <Accordion.Header>{t('left_menu.layout_sets')}</Accordion.Header>
            <Accordion.Content>
              {layoutSetNames ? <LayoutSetsContainer /> : <ConfigureLayoutSetPanel />}
            </Accordion.Content>
          </Accordion.Item>
        )}
      </Accordion>
      <div className={classes.componentsList}>
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
    </div>
  );
};
