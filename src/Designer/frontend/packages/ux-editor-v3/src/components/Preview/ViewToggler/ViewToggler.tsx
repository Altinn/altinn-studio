import React from 'react';
import { useTranslation } from 'react-i18next';

import classes from './ViewToggler.module.css';
import { StudioSwitch } from '@studio/components';

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
      <StudioSwitch
        data-size='sm'
        className={classes.toggler}
        onChange={handleViewToggle}
        defaultChecked={isMobileInitially}
        label={t('ux_editor.mobilePreview')}
      />
    </div>
  );
};
