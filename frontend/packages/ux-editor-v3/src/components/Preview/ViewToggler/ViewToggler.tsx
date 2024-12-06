import React from 'react';
import { Switch } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

import classes from './ViewToggler.module.css';

export type SupportedView = 'mobile' | 'desktop';

type ViewTogglerProps = {
  initialView?: SupportedView;
  onChange: (view: SupportedView) => void;
};
export const ViewToggler = ({ initialView = 'desktop', onChange }: ViewTogglerProps) => {
  const { t } = useTranslation();

  const isMobileInitially = initialView === 'mobile';

  const handleViewToggle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const isMobile = e.target.checked;
    onChange(isMobile ? 'mobile' : 'desktop');
  };

  return (
    <div className={classes.root}>
      <Switch
        size='small'
        className={classes.toggler}
        onChange={handleViewToggle}
        defaultChecked={isMobileInitially}
      >
        {t('ux_editor.mobilePreview')}
      </Switch>
    </div>
  );
};
