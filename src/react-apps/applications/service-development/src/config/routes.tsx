import * as React from 'react';
import uieditorApp from '../../../ux-editor/src/SubApp';

const DummySubApp = (name: any) => {
  return (
    <div>Dummy app for {name.name}</div>
  );
};

export const routes = ([
  {
    path: '/uieditor',
    activeSubHeaderSelection: 'create',
    activeLeftMenuSelection: 'gui',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/preview',
    activeSubHeaderSelection: 'create',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/text',
    activeSubHeaderSelection: 'language',
    activeLeftMenuSelection: 'text',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/test',
    activeSubHeaderSelection: 'test',
    activeLeftMenuSelection: 'test',
    menu: 'test',
    subapp: DummySubApp,
  },
  {
    path: '/aboutservice',
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'aboutservice',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/rolesandrights',
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'rolesandrights',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/production',
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'production',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/versionhistory',
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'versionhistory',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/aboutenduser',
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'aboutenduser',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/altinn',
    activeSubHeaderSelection: 'about',
    activeLeftMenuSelection: 'altinn',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/datamodel',
    activeSubHeaderSelection: 'create',
    activeLeftMenuSelection: 'datamodel',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/api',
    activeSubHeaderSelection: 'create',
    activeLeftMenuSelection: 'api',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/translate',
    activeSubHeaderSelection: 'language',
    activeLeftMenuSelection: 'translate',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/productionsetting',
    activeSubHeaderSelection: 'publish',
    activeLeftMenuSelection: 'productionsetting',
    menu: 'publish',
    subapp: DummySubApp,
  },
  {
    path: '/status',
    activeSubHeaderSelection: 'publish',
    activeLeftMenuSelection: 'status',
    menu: 'publish',
    subapp: DummySubApp,
  },
]);
