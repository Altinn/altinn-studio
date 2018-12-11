import * as React from 'react';
import uieditorApp from '../../../ux-editor/src/SubApp';

const DummySubApp = (name: any) => {
  return (
    <div>Dummy app for {name.name}</div>
  );
};

export const routes = [
  {
    path: '/uieditor',
    exact: true,
    activeSubHeaderSelection: 'create',
    activeLeftMenuSelection: 'gui',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/preview',
    exact: true,
    activeSubHeaderSelection: 'create',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/text',
    exact: true,
    activeSubHeaderSelection: 'language',
    activeLeftMenuSelection: 'text',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/test',
    exact: true,
    activeSubHeaderSelection: 'test',
    activeLeftMenuSelection: 'test',
    menu: 'test',
    subapp: DummySubApp,
  },
  {
    path: '/aboutservice',
    exact: true,
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'aboutservice',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/rolesandrights',
    exact: true,
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'rolesandrights',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/production',
    exact: true,
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'production',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/versionhistory',
    exact: true,
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'versionhistory',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/aboutenduser',
    exact: true,
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'aboutenduser',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/altinn',
    exact: true,
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'altinn',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/datamodel',
    exact: true,
    activeSubHeaderSelection: 'create',
    activeLeftMenuSelection: 'datamodel',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/api',
    exact: true,
    activeSubHeaderSelection: 'create',
    activeLeftMenuSelection: 'api',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/translate',
    exact: true,
    activeSubHeaderSelection: 'language',
    activeLeftMenuSelection: 'translate',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/productionsetting',
    exact: true,
    activeSubHeaderSelection: 'publish',
    activeLeftMenuSelection: 'productionsetting',
    menu: 'publish',
    subapp: DummySubApp,
  },
  {
    path: '/status',
    exact: true,
    activeSubHeaderSelection: 'publish',
    activeLeftMenuSelection: 'status',
    menu: 'publish',
    subapp: DummySubApp,
  },
];
