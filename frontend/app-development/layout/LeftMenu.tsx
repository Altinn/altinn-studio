import React from 'react';
import LeftDrawerMenu from 'app-shared/navigation/drawer/LeftDrawerMenu';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { IShareChangesComponentProps } from 'app-shared/version-control/ShareChangesButton';
import routes from '../config/routes';
import appDevelopmentLeftDrawerSettings from '../config/subPathSettings';
import HandleMergeConflict from '../features/handleMergeConflict/HandleMergeConflictContainer';
import { useMediaQuery } from '../common/hooks';

interface ILeftMenuProps {
  className: string;
  language: any;
  repoStatus: IShareChangesComponentProps;
  subAppClassName?: string;
}

const SideBar = () => {
  const shouldHideLeftMenu = useMediaQuery('(max-width: 600px)');

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
