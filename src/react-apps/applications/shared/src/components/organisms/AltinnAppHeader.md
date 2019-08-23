### Person for themselves

```jsx

const userParty = {partyId: 12, person: {firstName: 'Ola', middleName: '', lastName: 'Nordmann'}, ssn: '123467'};

<AltinnAppHeader
  logoColor={'#022F51'}
  headerColor={'#1EAEF7'}
  party={userParty}
  userParty={userParty}
/>

```

### Person for person

```jsx

const userParty = {partyId: 12, person: {firstName: 'Ola', middleName: '', lastName: 'Nordmann'}, ssn: '123467'};
const party = {partyId: 13, person: {firstName: 'Tine', middleName: '', lastName: 'Melk'}, ssn: '123467'};

<AltinnAppHeader
  logoColor={'#022F51'}
  headerColor={'#1EAEF7'}
  party={party}
  userParty={userParty}
/>

```

### Person for organization

```jsx

const userParty = {partyId: 12, person: {firstName: 'Ola', middleName: '', lastName: 'Nordmann'}, ssn: '123467'};
const party = {partyId: 13, organization: {name: 'FIRMA AS'}, orgNumber: '123467'};

<AltinnAppHeader
  logoColor={'#022F51'}
  headerColor={'#1EAEF7'}
  party={party}
  userParty={userParty}
/>

```
