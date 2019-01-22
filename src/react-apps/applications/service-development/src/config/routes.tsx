import * as React from 'react';
import VersionControlHeader from '../../../shared/src/version-control/versionControlHeader';
import uieditorApp from '../../../ux-editor/src/SubApp';

const DummySubApp = (name: any) => {
  return (
    <div>
      <VersionControlHeader language={null} />
      Dummy app for {name.name}
    </div>
  );
};

export const routes = [
  {
    path: '/uieditor',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'GUI',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/preview',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    menu: 'create',
    subapp: uieditorApp,
  },
  {
    path: '/text',
    exact: true,
    activeSubHeaderSelection: 'Språk',
    activeLeftMenuSelection: 'Tekst',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/test',
    exact: true,
    activeSubHeaderSelection: 'Teste',
    activeLeftMenuSelection: 'Test',
    menu: 'test',
    subapp: DummySubApp,
  },
  {
    path: '/aboutservice',
    exact: true,
    activeSubHeaderSelection: 'Om',
    activeLeftMenuSelection: 'Om tjenesten',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/rolesandrights',
    exact: true,
    activeSubHeaderSelection: 'Om',
    activeLeftMenuSelection: 'Roller og rettigheter',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/production',
    exact: true,
    activeSubHeaderSelection: 'Om',
    activeLeftMenuSelection: 'Produksjon',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/versionhistory',
    exact: true,
    activeSubHeaderSelection: 'Om',
    activeLeftMenuSelection: 'Versjonshistorikk',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/aboutenduser',
    exact: true,
    activeSubHeaderSelection: 'Om',
    activeLeftMenuSelection: 'Om sluttbrukeren',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/altinn',
    exact: true,
    activeSubHeaderSelection: 'Om',
    activeLeftMenuSelection: 'Altinn',
    menu: 'about',
    subapp: DummySubApp,
  },
  {
    path: '/datamodel',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'Datamodell',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/api',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'API',
    menu: 'create',
    subapp: DummySubApp,
  },
  {
    path: '/translate',
    exact: true,
    activeSubHeaderSelection: 'Språk',
    activeLeftMenuSelection: 'Flere språk',
    menu: 'language',
    subapp: DummySubApp,
  },
  {
    path: '/productionsetting',
    exact: true,
    activeSubHeaderSelection: 'Publisere',
    activeLeftMenuSelection: 'Produksjonsette',
    menu: 'publish',
    subapp: DummySubApp,
  },
  {
    path: '/status',
    exact: true,
    activeSubHeaderSelection: 'Publisere',
    activeLeftMenuSelection: 'Status',
    menu: 'publish',
    subapp: DummySubApp,
  },
  {
    path: '/designSystem',
    exact: true,
    activeSubHeaderSelection: 'Lage',
    activeLeftMenuSelection: 'GUI',
    menu: 'create',
    subapp: DummySubApp,
  },
];
