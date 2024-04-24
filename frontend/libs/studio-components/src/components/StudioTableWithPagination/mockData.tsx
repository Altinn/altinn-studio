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
  [iconButton(<StarFillIcon />), 'Lila Patel', 'Software Engineer', 'Pending', link()],
  [iconButton(<StarIcon />), 'Ethan Nakamura', 'Marketing Specialist', 'Approved', link()],
  [iconButton(<StarIcon />), 'Olivia Chen', 'Data Analyst', 'Pending', link()],
  [iconButton(<FaceSmileFillIcon />), 'Noah Adebayo', 'UX Designer', 'Approved', link()],
  [iconButton(<FaceSmileIcon />), 'Sophia Ivanov', 'Product Manager', 'Pending', link()],
  [iconButton(<StarFillIcon />), 'William Torres', 'Sales Representative', 'Approved', link()],
  [iconButton(<StarIcon />), 'Ava Gupta', 'Human Resources Manager', 'Pending', link()],
  [iconButton(<StarIcon />), 'James Kim', 'Financial Analyst', 'Approved', link()],
  [iconButton(<StarIcon />), 'Mia Sánchez', 'Customer Support Specialist', 'Pending', link()],
  [iconButton(<StarFillIcon />), 'Lila Patel', 'Software Engineer', 'Pending', link()],
  [iconButton(<StarIcon />), 'Ethan Nakamura', 'Marketing Specialist', 'Approved', link()],
  [iconButton(<StarIcon />), 'Olivia Chen', 'Data Analyst', 'Pending', link()],
  [iconButton(<FaceSmileFillIcon />), 'Noah Adebayo', 'UX Designer', 'Approved', link()],
  [iconButton(<FaceSmileIcon />), 'Sophia Ivanov', 'Product Manager', 'Pending', link()],
  [iconButton(<StarFillIcon />), 'William Torres', 'Sales Representative', 'Approved', link()],
  [iconButton(<StarIcon />), 'Ava Gupta', 'Human Resources Manager', 'Pending', link()],
  [iconButton(<StarIcon />), 'James Kim', 'Financial Analyst', 'Approved', link()],
  [iconButton(<StarIcon />), 'Mia Sánchez', 'Customer Support Specialist', 'Pending', link()],
];

export const columns = ['', 'Name', 'Role', 'Status', ''];
