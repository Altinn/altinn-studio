import React from 'react';
import {
  SubPreviewMenuLeftContent,
  SubPreviewMenuRightContent,
} from './AppBarConfig/AppPreviewBarConfig';
import classes from './AppPreviewSubMenu.module.css';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';

export interface AppPreviewSubMenuProps {
  viewSize: 'desktop' | 'mobile';
  setViewSize: (value: any) => void;
  selectedLayoutSet: string | null;
  handleChangeLayoutSet: (value: any) => void;
}

export const AppPreviewSubMenu = ({
  viewSize,
  setViewSize,
  selectedLayoutSet,
  handleChangeLayoutSet,
}: AppPreviewSubMenuProps) => {
  return (
    <>
      <div className={classes.leftContent}>
        <SubPreviewMenuLeftContent
          viewSize={viewSize}
          setViewSize={setViewSize}
          selectedLayoutSet={selectedLayoutSet}
          handleChangeLayoutSet={handleChangeLayoutSet}
        />
      </div>
      {!_useIsProdHack() && (
        <div className={classes.rightContent}>
          <SubPreviewMenuRightContent />
        </div>
      )}
    </>
  );
};
