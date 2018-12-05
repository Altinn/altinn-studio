import * as React from 'react';
import uieditorApp from '../../../ux-editor/src/SubApp';

const DummySubApp = (name: any) => {
  return (
    <div>Dummy app for {name.name}</div>
  );
};

export const routes = ([
  {
    path: '/about',
    exact: true,
    activeSubHeaderSelection: 'om',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/uieditor',
    activeSubHeaderSelection: 'lage',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/preview',
    activeSubHeaderSelection: 'lage',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/language',
    activeSubHeaderSelection: 'sprak',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/test',
    activeSubHeaderSelection: 'teste',
    menu: 'test',
    subapp: DummySubApp,
  },
  {
    path: '/publish',
    activeSubHeaderSelection: 'publisere',
    menu: 'publish',
    subapp: DummySubApp,
  },
  {
    path: '/aboutservice',
    activeSubHeaderSelection: 'om',
    activeLeftMenuSelection: 'omtjenesten',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/rolesandrights',
    activeSubHeaderSelection: 'om',
    activeLeftMenuSelection: 'roller',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/production',
    activeSubHeaderSelection: 'om',
    activeLeftMenuSelection: 'produksjon',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/versionhistory',
    activeSubHeaderSelection: 'om',
    activeLeftMenuSelection: 'versjonshistorikk',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/aboutenduser',
    activeSubHeaderSelection: 'om',
    activeLeftMenuSelection: 'omsluttbrukeren',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/altinn',
    activeSubHeaderSelection: 'om',
    activeLeftMenuSelection: 'altinn',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/datamodel',
    activeSubHeaderSelection: 'lage',
    activeLeftMenuSelection: 'datamodel',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/api',
    activeSubHeaderSelection: 'lage',
    activeLeftMenuSelection: 'api',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/text',
    activeSubHeaderSelection: 'sprak',
    activeLeftMenuSelection: 'text',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/translate',
    activeSubHeaderSelection: 'sprak',
    activeLeftMenuSelection: 'flere sprak',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/productionsetting',
    activeSubHeaderSelection: 'publisere',
    activeLeftMenuSelection: 'text',
    menu: 'publish',
    subapp: DummySubApp,
  },
  {
    path: '/status',
    activeSubHeaderSelection: 'publisere',
    activeLeftMenuSelection: 'status',
    menu: 'publish',
    subapp: DummySubApp,
  },
]);
