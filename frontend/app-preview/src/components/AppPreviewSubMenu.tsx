import { ToggleButtonGroup } from '@digdir/design-system-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SubPreviewMenuContent } from '../components/AppBarConfig/AppPreviewBarConfig';
import classes from './AppPreviewSubMenu.module.css';

export interface AppPreviewSubMenuProps {
  viewSize: 'desktop' | 'mobile';
  setViewSize: (value: any) => void;
}

export const AppPreviewSubMenu = ({ viewSize, setViewSize }: AppPreviewSubMenuProps) => {
  const { t } = useTranslation();
  const handleChangeViewSizeClick = (selectedViewSize: string) => {
    localStorage.setItem('viewSize', selectedViewSize);
    setViewSize(selectedViewSize);
  };

  return (
    <>
      <div className={classes.leftContent}>
        <div className={classes.viewSizeButtons}>
          <ToggleButtonGroup
            items={[
              {
                label: t('preview.view_size_desktop'),
                value: 'desktop',
              },
              {
                label: t('preview.view_size_mobile'),
                value: 'mobile',
              },
            ]}
            onChange={handleChangeViewSizeClick}
            selectedValue={viewSize === 'desktop' ? 'desktop' : 'mobile'}
          />
        </div>
      </div>
      <div className={classes.rightContent}>{<SubPreviewMenuContent />}</div>
    </>
  );
};
