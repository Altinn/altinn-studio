import React from 'react';
import classes from './RightMenu.module.css';
import type { IAppState, LogicMode } from '../../types/global';
import { Add } from '@navikt/ds-icons';
import { Button, ButtonVariant } from '@altinn/altinn-design-system';
import { ConditionalRenderingModal } from '../toolbar/ConditionalRenderingModal';
import { ConfirmationPageElement } from './pages/ConfirmationPageElement';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { PagesContainer } from './pages/PagesContainer';
import { RuleModal } from '../toolbar/RuleModal';
import { deepCopy } from 'app-shared/pure';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Divider } from 'app-shared/primitives';

export interface IRightMenuProps {
  toggleFileEditor: (mode?: LogicMode) => void;
  language: object;
}

export function RightMenu(props: IRightMenuProps) {
  const [conditionalModalOpen, setConditionalModalOpen] = React.useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [ruleModalOpen, setRuleModalOpen] = React.useState<boolean>(false);
  const layoutOrder = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order
  );
  const dispatch = useDispatch();
  const t = (key: string) => getLanguageFromKey(key, props.language);
  function handleModalChange(type: 'conditionalRendering' | 'rules') {
    if (type === 'conditionalRendering') {
      setConditionalModalOpen(!conditionalModalOpen);
    } else if (type === 'rules') {
      setRuleModalOpen(!ruleModalOpen);
    }
  }

  function handleAddPage() {
    const name = t('right_menu.page') + (layoutOrder.length + 1);
    dispatch(FormLayoutActions.addLayout({ layout: name, isConfirmationPage: false }));
    setSearchParams({ ...deepCopy(searchParams), layout: name });
  }

  return (
    <div className={classes.main}>
      <div className={classes.headerSection}>
        <span>{t('right_menu.pages')}</span>
        <Button
          aria-label={t('right_menu.pages_add_alt')}
          className={classes.addIcon}
          icon={<Add />}
          onClick={handleAddPage}
          variant={ButtonVariant.Quiet}
        />
      </div>
      <div className={classes.contentSection}>
        <PagesContainer />
        <Divider />
        <ConfirmationPageElement />
      </div>
      <div className={classes.headerSection}>{t('right_menu.dynamics')}</div>
      <div className={classes.contentSection}>
        {t('right_menu.dynamics_description')}&nbsp;
        <a
          target='_blank'
          rel='noopener noreferrer'
          href='https://docs.altinn.studio/app/development/logic/dynamic/'
        >
          {t('right_menu.dynamics_link')}
        </a>
        <div className={classes.textLink} onClick={() => props.toggleFileEditor('Dynamics')}>
          {t('right_menu.dynamics_edit')}
        </div>
      </div>
      <div className={classes.headerSection}>
        <span>{t('right_menu.rules_calculations')}</span>
        <Button
          aria-label={t('right_menu.rules_calculations_add_alt')}
          className={classes.addIcon}
          icon={<Add />}
          onClick={() => handleModalChange('rules')}
          variant={ButtonVariant.Quiet}
        />
      </div>
      <div className={classes.contentSection}>
        <RuleModal modalOpen={ruleModalOpen} handleClose={() => handleModalChange('rules')} />
      </div>
      <div className={classes.headerSection}>
        <span>{t('right_menu.rules_conditional_rendering')}</span>
        <Button
          aria-label={t('right_menu.rules_conditional_rendering_add_alt')}
          className={classes.addIcon}
          icon={<Add />}
          onClick={() => handleModalChange('conditionalRendering')}
          variant={ButtonVariant.Quiet}
        />
      </div>
      <div className={classes.contentSection}>
        <ConditionalRenderingModal
          modalOpen={conditionalModalOpen}
          handleClose={() => handleModalChange('conditionalRendering')}
        />
      </div>
    </div>
  );
}
