import React from 'react';
import { Button, ButtonVariant } from '@altinn/altinn-design-system';
import classes from './ConditionalRenderingTab.module.css';
import { Add } from '@navikt/ds-icons';
import { ConditionalRenderingModal } from '../toolbar/ConditionalRenderingModal';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { LogicMode } from '../../types/global';
import { Dynamics } from './Dynamics';
import { Divider } from 'app-shared/primitives';

interface ConditionalRenderingTabProps {
  language: object;
  toggleFileEditor: (mode?: LogicMode) => void;
}

export const ConditionalRenderingTab = ({ language, toggleFileEditor }: ConditionalRenderingTabProps) => {
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const t = (key: string) => getLanguageFromKey(key, language);
  return (
    <div className={classes.conditionalRendering}>
      <div>
        <div className={classes.header}>
          <span>{t('right_menu.rules_conditional_rendering')}</span>
          <Button
            aria-label={t('right_menu.rules_conditional_rendering_add_alt')}
            className={classes.addIcon}
            icon={<Add/>}
            onClick={() => setModalOpen(true)}
            variant={ButtonVariant.Quiet}
          />
        </div>
        <div>
          <ConditionalRenderingModal
            modalOpen={modalOpen}
            handleClose={() => setModalOpen(false)}
          />
        </div>
      </div>
      <Divider inMenu />
      <Dynamics language={language} toggleFileEditor={toggleFileEditor} />
    </div>
  );
};
