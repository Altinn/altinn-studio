import React from 'react';
import { useSelector } from 'react-redux';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { PlusIcon } from '@navikt/aksel-icons';
import { Button } from '@digdir/design-system-react';
import { PagesContainer } from './PagesContainer';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { ReceiptPageElement } from './ReceiptPageElement';
import { deepCopy } from 'app-shared/pure';
import { useParams, useSearchParams } from 'react-router-dom';
import cn from 'classnames';
import classes from './LeftMenu.module.css';
import { useText } from '../../hooks';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useLayoutSetsQuery } from "../../hooks/queries/useLayoutSetsQuery";
import { LayoutSetsContainer } from "./LayoutSetsContainer";
import { useDispatch } from 'react-redux';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { ConfigureLayoutSetPanel } from "./ConfigureLayoutSetPanel";
import { Accordion } from '@digdir/design-system-react';

export interface LeftMenuProps {
  className?: string;
}

export const LeftMenu = ({ className }: LeftMenuProps) => {
  const { org, app } = useParams();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout: string = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
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
    dispatch(FormLayoutActions.updateSelectedLayout(name));
  }

  function handleAddLayoutSet() {
    // TODO: Add layout set with set-name as user-input
    // auto-connect data model and process in backend?
  }

  return (
    <div className={cn(className, classes.rightMenu)}>
      <Accordion color="subtle">
      {
        !_useIsProdHack() && (
          <Accordion.Item defaultOpen={layoutSetNames?.length > 0}>
            <Accordion.Header>{t('left_menu.layout_sets')}</Accordion.Header>
            <Accordion.Content>
              {
                layoutSetNames ? (
                  <>
                    <LayoutSetsContainer/>
                    <div className={classes.addButton}>
                      <Button
                        icon={<PlusIcon/>}
                        onClick={handleAddLayoutSet}
                        size='small'
                      >
                        {t('left_menu.layout_sets_add')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <ConfigureLayoutSetPanel />
                )
              }
            </Accordion.Content>
          </Accordion.Item>
        )}
        <Accordion.Item defaultOpen={true}>
          <Accordion.Header>{t('left_menu.pages')}</Accordion.Header>
          <Accordion.Content className={classes.pagesContent}>
            <PagesContainer/>
            <ReceiptPageElement/>
            <div className={classes.addButton}>
              <Button
                icon={<PlusIcon/>}
                onClick={handleAddPage}
                size='small'
              >
                {t('left_menu.pages_add')}
              </Button>
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item defaultOpen={true}>
          <Accordion.Header>{t('left_menu.components')}</Accordion.Header>
          <Accordion.Content>
            {receiptLayoutName === selectedLayout ? <ConfPageToolbar/> : <DefaultToolbar/>}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
