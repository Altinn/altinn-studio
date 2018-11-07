export const leftNavMenuSettings: any = {
  menuTitle: 'Tjenesteoversikt',
  menuHierarchy: [
    {
      displayText: 'Tjenesteoversikt',
      navLink: '#',
      items: [],
    },
    {
      displayText: 'Tjenesteflyt',
      navLink: '#',
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
      items: [],
    },
    {
      displayText: 'Oversettelse',
      navLink: '#',
      items: [],
    },
    {
      displayText: 'Tekst',
      navLink: '#',
      items: [],
    },
  ],
};
