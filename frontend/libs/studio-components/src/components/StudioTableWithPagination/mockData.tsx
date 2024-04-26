import { Button, Link } from '@digdir/design-system-react';
import { FaceSmileFillIcon, FaceSmileIcon, StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import React from 'react';

const IconButton = ({ icon }) => (
  <Button variant={'tertiary'} icon>
    {icon}
  </Button>
);

const AltinnLink = () => <Link to={'https://altinn.no'}>Link</Link>;

function generateRandomId(length) {
  let result = '';
  const characters = '0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export const rows = [
  {
    icon: <IconButton icon={<StarFillIcon />} />,
    id: generateRandomId(6),
    name: 'Lila Patel',
    role: 'Software Engineer',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Ethan Nakamura',
    role: 'Marketing Specialist',
    status: 'Approved',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Olivia Chen',
    role: 'Data Analyst',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<FaceSmileFillIcon />} />,
    id: generateRandomId(6),
    name: 'Noah Adebayo',
    role: 'UX Designer',
    status: 'Approved',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<FaceSmileIcon />} />,
    id: generateRandomId(6),
    name: 'Sophia Ivanov',
    role: 'Product Manager',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarFillIcon />} />,
    id: generateRandomId(6),
    name: 'William Torres',
    role: 'Sales Representative',
    status: 'Approved',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Ava Gupta',
    role: 'Human Resources Manager',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'James Kim',
    role: 'Financial Analyst',
    status: 'Approved',
    link: AltinnLink(),
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Mia Sánchez',
    role: 'Customer Support Specialist',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarFillIcon />} />,
    id: generateRandomId(6),
    name: 'Lucas Wright',
    role: 'Software Engineer',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Chloe Tanaka',
    role: 'Marketing Specialist',
    status: 'Approved',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Emily Zhao',
    role: 'Data Analyst',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<FaceSmileFillIcon />} />,
    id: generateRandomId(6),
    name: 'Jacob Martinez',
    role: 'UX Designer',
    status: 'Approved',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<FaceSmileIcon />} />,
    id: generateRandomId(6),
    name: 'Isabella Johnson',
    role: 'Product Manager',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarFillIcon />} />,
    id: generateRandomId(6),
    name: 'Elijah Lee',
    role: 'Sales Representative',
    status: 'Approved',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Charlotte Silva',
    role: 'Human Resources Manager',
    status: 'Pending',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Benjamin Lopez',
    role: 'Financial Analyst',
    status: 'Approved',
    link: <AltinnLink />,
  },
  {
    icon: <IconButton icon={<StarIcon />} />,
    id: generateRandomId(6),
    name: 'Amelia Schmidt',
    role: 'Customer Support Specialist',
    status: 'Pending',
    link: <AltinnLink />,
  },
];

export const columns = [
  {
    accessor: 'icon',
    value: '',
  },
  {
    accessor: 'id',
    value: 'Employee ID',
  },
  {
    accessor: 'name',
    value: 'Name',
  },
  {
    accessor: 'role',
    value: 'Role',
  },
  {
    accessor: 'status',
    value: 'Status',
  },
  {
    accessor: 'link',
    value: '',
  },
];
