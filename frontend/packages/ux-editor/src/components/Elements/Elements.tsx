import React from 'react';
import { useSelector } from 'react-redux';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { PlusIcon } from '@navikt/aksel-icons';
import { Button, Heading } from '@digdir/design-system-react';
import { PagesContainer } from './PagesContainer';
import { ReceiptPageElement } from './ReceiptPageElement';
import { deepCopy } from 'app-shared/pure';
import { useSearchParams } from 'react-router-dom';
import { useText } from '../../hooks';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../../selectors/formLayoutSelectors';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useLayoutSetsQuery } from '../../hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import { useDispatch } from 'react-redux';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { ConfigureLayoutSetPanel } from './ConfigureLayoutSetPanel';
import { Accordion } from '@digdir/design-system-react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import classes from './Elements.module.css';
import { Divider } from "app-shared/primitives";

export const Elements = () => {
  const { org, app } = useStudioUrlParams();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout: string = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const { pages, receiptLayoutName } = formLayoutSettingsQuery.data;
  const layoutOrder = pages.order;
  const layoutSetNames = layoutSetsQuery?.data?.sets;

  const t = useText();

  function handleAddPage() {
    let count = 1;
    let name = t('left_menu.page') + (layoutOrder.length + count);
    while (layoutOrder.indexOf(name) > -1) {
      count += 1;
      name = t('left_menu.page') + (layoutOrder.length + count);
    }
    addLayoutMutation.mutate({ layoutName: name, isReceiptPage: false });
    setSearchParams({ ...deepCopy(searchParams), layout: name });
    localStorage.setItem(instanceId, name);
    dispatch(FormLayoutActions.updateSelectedLayout(name));
  }

  return (
    <div className={classes.root}>
      {shouldDisplayFeature('configureLayoutSet') && layoutSetNames ? (
          <ConfigureLayoutSetPanel />
      ) : (
          <LayoutSetsContainer />
      )}
      <Accordion color='subtle'>
        <Accordion.Item defaultOpen={true}>
          <Accordion.Header>{t('left_menu.pages')}</Accordion.Header>
          <Accordion.Content className={classes.pagesContent}>
            <PagesContainer />
            <ReceiptPageElement />
            <div className={classes.addButton}>
              <Button icon={<PlusIcon />} onClick={handleAddPage} size='small'>
                {t('left_menu.pages_add')}
              </Button>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
      <div className={classes.componentsList}>
        <Heading size='xxsmall' className={classes.componentsHeader}>
          {t('left_menu.components')}
        </Heading>
        {receiptLayoutName === selectedLayout ? <ConfPageToolbar /> : <DefaultToolbar />}
      </div>
    </div>
  );
};
