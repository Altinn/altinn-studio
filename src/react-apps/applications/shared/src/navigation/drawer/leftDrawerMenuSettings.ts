export interface IAltinnWindow extends Window {
  org: string;
  service: string;
  instanceId: string;
  reportee: string;
}

const altinnWindow: IAltinnWindow = window as IAltinnWindow;
const { org, service } = altinnWindow;
const servicePath: string = `${org}/${service}`;

export const leftDrawerMenuSettings: any = {
  menuTitle: 'Tjenesteoversikt',
  menuHierarchy: [
    {
      displayText: 'Tjenesteoversikt',
      navLink: '#',
      iconName: 'ai ai-info',
      items: [],
    },
    {
      displayText: 'Tjenesteflyt',
      navLink: '#',
      iconName: 'ai ai-archive',
      items: [],
    },
    {
      displayText: 'Tjenestelogikk',
      navLink: `${altinnWindow.location.origin}/designer/${servicePath}/Rules/Code`,
      iconName: 'ai ai-archive',
      items: [],
    },
    {
      displayText: 'Datamodell',
      navLink: `${altinnWindow.location.origin}/designer/${servicePath}/Model`,
      iconName: 'ai ai-archive',
      items: [],
    },
    {
      displayText: 'Oversettelse',
      navLink: `${altinnWindow.location.origin}/designer/${servicePath}/Text`,
      iconName: 'ai ai-archive',
      items: [],
    },
    {
      displayText: 'Test',
      navLink: `${altinnWindow.location.origin}/${servicePath}/runtime/ManualTesting`,
      iconName: 'ai ai-archive',
      items: [],
    },
  ],
};
