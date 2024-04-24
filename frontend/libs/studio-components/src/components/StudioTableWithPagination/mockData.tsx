import { Button, Link } from '@digdir/design-system-react';
import { FaceSmileFillIcon, FaceSmileIcon, StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import React from 'react';

const IconButton = ({ icon }) => (
  <Button variant={'tertiary'} icon>
    {icon}
  </Button>
);

const AltinnLink = () => <Link to={'https://altinn.no'}>Link</Link>;

export const rows = [
  [
    <IconButton icon={<StarFillIcon />} />,
    '123456',
    'Lila Patel',
    'Software Engineer',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '234567',
    'Ethan Nakamura',
    'Marketing Specialist',
    'Approved',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '345678',
    'Olivia Chen',
    'Data Analyst',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<FaceSmileFillIcon />} />,
    '456789',
    'Noah Adebayo',
    'UX Designer',
    'Approved',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<FaceSmileIcon />} />,
    '567890',
    'Sophia Ivanov',
    'Product Manager',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarFillIcon />} />,
    '678901',
    'William Torres',
    'Sales Representative',
    'Approved',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '789012',
    'Ava Gupta',
    'Human Resources Manager',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '890123',
    'James Kim',
    'Financial Analyst',
    'Approved',
    AltinnLink(),
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '901234',
    'Mia Sánchez',
    'Customer Support Specialist',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarFillIcon />} />,
    '012345',
    'Lila Patel',
    'Software Engineer',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '123450',
    'Ethan Nakamura',
    'Marketing Specialist',
    'Approved',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '234501',
    'Olivia Chen',
    'Data Analyst',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<FaceSmileFillIcon />} />,
    '345012',
    'Noah Adebayo',
    'UX Designer',
    'Approved',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<FaceSmileIcon />} />,
    '450123',
    'Sophia Ivanov',
    'Product Manager',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarFillIcon />} />,
    '501234',
    'William Torres',
    'Sales Representative',
    'Approved',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '012345',
    'Ava Gupta',
    'Human Resources Manager',
    'Pending',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '123450',
    'James Kim',
    'Financial Analyst',
    'Approved',
    <AltinnLink />,
  ],
  [
    <IconButton icon={<StarIcon />} />,
    '234501',
    'Mia Sánchez',
    'Customer Support Specialist',
    'Pending',
    <AltinnLink />,
  ],
];

// export const rows = [
//   {
//     icon: <IconButton icon={<StarFillIcon/>}/>,
//     id: '123456',
//     name: 'Lila Patel',
//     position: 'Software Engineer',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '234567',
//     name: 'Ethan Nakamura',
//     position: 'Marketing Specialist',
//     status: 'Approved',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '345678',
//     name: 'Olivia Chen',
//     position: 'Data Analyst',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<FaceSmileFillIcon/>}/>,
//     id: '456789',
//     name: 'Noah Adebayo',
//     position: 'UX Designer',
//     status: 'Approved',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<FaceSmileIcon/>}/>,
//     id: '567890',
//     name: 'Sophia Ivanov',
//     position: 'Product Manager',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarFillIcon/>}/>,
//     id: '678901',
//     name: 'William Torres',
//     position: 'Sales Representative',
//     status: 'Approved',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '789012',
//     name: 'Ava Gupta',
//     position: 'Human Resources Manager',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '890123',
//     name: 'James Kim',
//     position: 'Financial Analyst',
//     status: 'Approved',
//     link: AltinnLink()
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '901234',
//     name: 'Mia Sánchez',
//     position: 'Customer Support Specialist',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarFillIcon/>}/>,
//     id: '012345',
//     name: 'Lila Patel',
//     position: 'Software Engineer',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '123450',
//     name: 'Ethan Nakamura',
//     position: 'Marketing Specialist',
//     status: 'Approved',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '234501',
//     name: 'Olivia Chen',
//     position: 'Data Analyst',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<FaceSmileFillIcon/>}/>,
//     id: '345012',
//     name: 'Noah Adebayo',
//     position: 'UX Designer',
//     status: 'Approved',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<FaceSmileIcon/>}/>,
//     id: '450123',
//     name: 'Sophia Ivanov',
//     position: 'Product Manager',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarFillIcon/>}/>,
//     id: '501234',
//     name: 'William Torres',
//     position: 'Sales Representative',
//     status: 'Approved',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '012345',
//     name: 'Ava Gupta',
//     position: 'Human Resources Manager',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '123450',
//     name: 'James Kim',
//     position: 'Financial Analyst',
//     status: 'Approved',
//     link: <AltinnLink/>
//   },
//   {
//     icon: <IconButton icon={<StarIcon/>}/>,
//     id: '234501',
//     name: 'Mia Sánchez',
//     position: 'Customer Support Specialist',
//     status: 'Pending',
//     link: <AltinnLink/>
//   },
// ];

export const columns = ['', 'Employee ID', 'Name', 'Role', 'Status', ''];
