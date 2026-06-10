export type TenorOrg = {
  name: string;
  orgNr: string;
};

export type TenorRoleType = 'Manager' | 'Chairman' | 'Accountant' | 'Auditor';

export type TenorRole = {
  type: TenorRoleType;
  forOrg: keyof typeof tenorOrgs;
};

export type TenorUser = {
  firstName: string;
  lastName: string;
  name: string;
  reverseName: string;
  ssn: string;
  role?: TenorRole;
};

export type TenorLoginParams = {
  appName: string;
  tenorUser: TenorUser;
  authenticationLevel: string;
};

const tenorOrgs = {
  sivilisertAvansertIsbjoernSA: {
    name: 'Sivilisert Avansert Isbjørn SA',
    orgNr: '312405091',
  },
  overflodigSlemTigerAS: {
    name: 'Overflødig Slem Tiger AS',
    orgNr: '310926833',
  },
} as const;

function name(first: string, last: string): { name: string; reverseName: string; firstName: string; lastName: string } {
  return { name: `${first} ${last}`, reverseName: `${last} ${first}`, firstName: first, lastName: last };
}

const tenorUsers = {
  saligBlomsterplante: {
    ...name('Salig', 'Blomsterplante'),
    ssn: '20920448276',
  },
  humanAndrefiolin: {
    ...name('Human', 'Andrefiolin'),
    ssn: '09876298713',
    role: {
      type: 'Manager',
      forOrg: 'sivilisertAvansertIsbjoernSA',
    },
  },
  varsomDiameter: {
    ...name('Varsom', 'Diameter'),
    ssn: '03835698199',
    role: {
      type: 'Chairman',
      forOrg: 'sivilisertAvansertIsbjoernSA',
    },
  },
  standhaftigBjornunge: {
    ...name('Standhaftig', 'Bjørnunge'),
    ssn: '23849199013',
  },
  snaalDugnad: {
    ...name('Snål', 'Dugnad'),
    ssn: '10928198958',
  },
  raffinertFilm: {
    ...name('Raffinert', 'Film'),
    ssn: '28826898781',
    role: {
      type: 'Manager',
      forOrg: 'overflodigSlemTigerAS',
    },
  },
  akustiskGaranti: {
    ...name('Akustisk', 'Garanti'),
    ssn: '04845698703',
    role: {
      type: 'Chairman',
      forOrg: 'overflodigSlemTigerAS',
    },
  },
  beskjedenGitar: {
    ...name('Beskjeden', 'Gitar'),
    ssn: '15893148970',
    role: {
      type: 'Accountant',
      forOrg: 'overflodigSlemTigerAS',
    },
  },
  dypsindigLoddsnor: {
    ...name('Dypsindig', 'Loddsnor'),
    ssn: '12887498871',
    role: {
      type: 'Auditor',
      forOrg: 'overflodigSlemTigerAS',
    },
  },
} as const;

export const Tenor = {
  users: tenorUsers satisfies Record<keyof typeof tenorUsers, TenorUser>,
  orgs: tenorOrgs satisfies Record<keyof typeof tenorOrgs, TenorOrg>,
};
