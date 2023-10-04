import React from 'react';
import { useSelector } from 'react-redux';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { PlusIcon } from '@navikt/aksel-icons';
import { Button, Paragraph } from '@digdir/design-system-react';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import cn from 'classnames';
import classes from './LeftMenu.module.css';
import { useText } from '../../hooks';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../../selectors/formLayoutSelectors';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useLayoutSetsQuery } from '../../hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import { ConfigureLayoutSetPanel } from './ConfigureLayoutSetPanel';
import { Accordion } from '@digdir/design-system-react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export interface LeftMenuProps {
  className?: string;
}

export const LeftMenu = ({ className }: LeftMenuProps) => {
  const { org, app } = useStudioUrlParams();
  const selectedLayout: string = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const { receiptLayoutName } = formLayoutSettingsQuery.data;
  const layoutSetNames = layoutSetsQuery?.data?.sets;

  const hideComponents = selectedLayout === 'default' || selectedLayout === undefined;

  const t = useText();

  function handleAddLayoutSet() {
    // TODO: Add layout set with set-name as user-input
    // auto-connect data model and process in backend?
  }

  return (
    <div className={cn(className, classes.rightMenu)}>
      {shouldDisplayFeature('configureLayoutSet') && layoutSetNames ? (
        <>
          <LayoutSetsContainer />
          <div className={classes.addButton}>
            <Button icon={<PlusIcon />} onClick={handleAddLayoutSet} size='small'>
              {t('left_menu.layout_sets_add')}
            </Button>
          </div>
        </>
      ) : (
        <ConfigureLayoutSetPanel />
      )}
      <Accordion color='subtle'>
        {shouldDisplayFeature('configureLayoutSet') && (
          <Accordion.Item defaultOpen={layoutSetNames?.length > 0}>
            <Accordion.Header>{t('left_menu.layout_sets')}</Accordion.Header>
            <Accordion.Content>
              {layoutSetNames ? (
                <>
                  <LayoutSetsContainer />
                  <div className={classes.addButton}>
                    <Button icon={<PlusIcon />} onClick={handleAddLayoutSet} size='small'>
                      {t('left_menu.layout_sets_add')}
                    </Button>
                  </div>
                </>
              ) : (
                <ConfigureLayoutSetPanel />
              )}
            </Accordion.Content>
          </Accordion.Item>
        )}
        <Accordion.Item defaultOpen={!hideComponents}>
          <Accordion.Header>{t('left_menu.components')}</Accordion.Header>
          <Accordion.Content>
            {hideComponents ? (
              <Paragraph size='small'>{t('left_menu.no_components_selected')}</Paragraph>
            ) : receiptLayoutName === selectedLayout ? (
              <ConfPageToolbar />
            ) : (
              <DefaultToolbar />
            )}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
