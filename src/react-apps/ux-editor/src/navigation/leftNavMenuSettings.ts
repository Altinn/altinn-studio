export const leftNavMenuSettings: any = {
  menuTitle: 'Tjenesteoversikt',
  menuHierarchy: [
    {
      displayText: 'Tjenesteoversikt',
      navLink: '#',
      iconName: 'ai ai-archive',
      items: [],
    },
    {
      displayText: 'Tjenesteflyt',
      navLink: '#',
      iconName: 'ai ai-archive',
      items: [
        {
          navLink: '#',
          name: 'Steg 1',
          topLevel: false,
        },
        {
          navLink: '#',
          name: 'Steg 2',
          topLevel: false,
        },
        {
          navLink: '#',
          name: 'Steg 3',
          topLevel: false,
        },
      ],
    },
    {
      displayText: 'Tjenestelogikk',
      navLink: '#',
      iconName: 'ai ai-archive',
      items: [
        {
          name: 'Valideringer',
          navLink: '#',
          topLevel: false,
        },
        {
          name: 'Kalkuleringer',
          navLink: '#',
          topLevel: false,
        },
      ],
    },
    {
      displayText: 'Datamodell',
      navLink: '#',
      iconName: 'ai ai-archive',
      items: [],
    },
    {
      displayText: 'Oversettelse',
      navLink: '#',
      iconName: 'ai ai-archive',
      items: [],
    },
    {
      displayText: 'Tekst',
      navLink: '#',
      iconName: 'ai ai-archive',
      items: [],
    },
  ],
};
