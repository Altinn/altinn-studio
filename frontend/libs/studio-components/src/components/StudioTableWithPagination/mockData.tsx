import { Button, Link } from '@digdir/design-system-react';
import { FaceSmileFillIcon, FaceSmileIcon, StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import React from 'react';

const iconButton = (icon) => (
  <Button variant={'tertiary'} icon>
    {icon}
  </Button>
);

const link = () => <Link to={'https://altinn.no'}>Link</Link>;

export const rows = [
  [iconButton(<StarFillIcon />), '123456', 'Lila Patel', 'Software Engineer', 'Pending', link()],
  [
    iconButton(<StarIcon />),
    '234567',
    'Ethan Nakamura',
    'Marketing Specialist',
    'Approved',
    link(),
  ],
  [iconButton(<StarIcon />), '345678', 'Olivia Chen', 'Data Analyst', 'Pending', link()],
  [iconButton(<FaceSmileFillIcon />), '456789', 'Noah Adebayo', 'UX Designer', 'Approved', link()],
  [iconButton(<FaceSmileIcon />), '567890', 'Sophia Ivanov', 'Product Manager', 'Pending', link()],
  [
    iconButton(<StarFillIcon />),
    '678901',
    'William Torres',
    'Sales Representative',
    'Approved',
    link(),
  ],
  [iconButton(<StarIcon />), '789012', 'Ava Gupta', 'Human Resources Manager', 'Pending', link()],
  [iconButton(<StarIcon />), '890123', 'James Kim', 'Financial Analyst', 'Approved', link()],
  [
    iconButton(<StarIcon />),
    '901234',
    'Mia Sánchez',
    'Customer Support Specialist',
    'Pending',
    link(),
  ],
  [iconButton(<StarFillIcon />), '012345', 'Lila Patel', 'Software Engineer', 'Pending', link()],
  [
    iconButton(<StarIcon />),
    '123450',
    'Ethan Nakamura',
    'Marketing Specialist',
    'Approved',
    link(),
  ],
  [iconButton(<StarIcon />), '234501', 'Olivia Chen', 'Data Analyst', 'Pending', link()],
  [iconButton(<FaceSmileFillIcon />), '345012', 'Noah Adebayo', 'UX Designer', 'Approved', link()],
  [iconButton(<FaceSmileIcon />), '450123', 'Sophia Ivanov', 'Product Manager', 'Pending', link()],
  [
    iconButton(<StarFillIcon />),
    '501234',
    'William Torres',
    'Sales Representative',
    'Approved',
    link(),
  ],
  [iconButton(<StarIcon />), '012345', 'Ava Gupta', 'Human Resources Manager', 'Pending', link()],
  [iconButton(<StarIcon />), '123450', 'James Kim', 'Financial Analyst', 'Approved', link()],
  [
    iconButton(<StarIcon />),
    '234501',
    'Mia Sánchez',
    'Customer Support Specialist',
    'Pending',
    link(),
  ],
];

export const columns = ['', 'Employee ID', 'Name', 'Role', 'Status', ''];
