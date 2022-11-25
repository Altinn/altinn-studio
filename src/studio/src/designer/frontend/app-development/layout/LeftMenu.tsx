import React from 'react';
import type { Theme } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import LeftDrawerMenu from 'app-shared/navigation/drawer/LeftDrawerMenu';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { IShareChangesComponentProps } from 'app-shared/version-control/shareChanges';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import HandleMergeConflict from '../features/handleMergeConflict/HandleMergeConflictContainer';

interface ILeftMenuProps {
  className: string;
  language: any;
  repoStatus: IShareChangesComponentProps;
  subAppClassName?: string;
}

const SideBar = () => {
  const shouldHideLeftMenu = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  if (shouldHideLeftMenu) {
    return null;
  }

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <LeftDrawerMenu
              menuType={route.menu}
              activeLeftMenuSelection={route.activeLeftMenuSelection}
              leftMenuItems={appDevelopmentLeftDrawerSettings}
            />
          }
        />
      ))}
    </Routes>
  );
};

const LeftMenu = ({ repoStatus, language, className, subAppClassName }: ILeftMenuProps) => (
  <div className={className}>
    {!repoStatus.hasMergeConflict ? (
      <>
        <SideBar />
        <div className={subAppClassName}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.subapp {...route.props} language={language} />}
              />
            ))}
          </Routes>
        </div>
      </>
    ) : (
      <div className={subAppClassName}>
        <Routes>
          <Route path={'/'} element={<Navigate to='/mergeconflict' replace />} />
          <Route path='/mergeconflict' element={<HandleMergeConflict />} />
        </Routes>
      </div>
    )}
  </div>
);

export default LeftMenu;
