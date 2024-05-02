import { Button } from '@digdir/design-system-react';
import { StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import React from 'react';
import type { Rows } from './StudioTableRemotePagination';

type IconButtonProps = {
  icon: React.ReactNode;
};

const IconButton = ({ icon }: IconButtonProps): React.ReactElement => (
  <Button variant={'tertiary'} icon>
    {icon}
  </Button>
);

export const columns = [
  {
    accessor: 'icon',
    value: '',
  },
  {
    accessor: 'name',
    value: 'Name',
  },
  {
    accessor: 'creator',
    value: 'Created by',
  },
  {
    accessor: 'lastChanged',
    value: 'Last changed',
  },
];

export const rows: Rows = [
  {
    id: 1,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Coordinated register notification',
    creator: 'Brønnøysund Register Centre',
    lastChanged: new Date('2023-04-12').toLocaleDateString(),
  },
  {
    id: 2,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for authorisation and license as a healthcare personnel',
    creator: 'The Norwegian Directorate of Health',
    lastChanged: new Date('2023-04-05').toLocaleDateString(),
  },
  {
    id: 3,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Produkter og tjenester fra Brønnøysundregistrene',
    creator: 'Brønnøysund Register Centre',
    lastChanged: new Date('2023-04-16').toLocaleDateString(),
  },
  {
    id: 4,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Contact form - Norwegian Tax Administration (private individual)',
    creator: 'Tax Administration',
    lastChanged: new Date('2023-04-08').toLocaleDateString(),
  },
  {
    id: 5,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Contact form - Norwegian Tax Administration (commercial)',
    creator: 'Tax Administration',
    lastChanged: new Date('2023-04-01').toLocaleDateString(),
  },
  {
    id: 6,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'A-melding – all forms',
    creator: 'Brønnøysund Register Centre',
    lastChanged: new Date('2023-04-14').toLocaleDateString(),
  },
  {
    id: 7,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for VAT registration',
    creator: 'Tax Administration',
    lastChanged: new Date('2023-04-03').toLocaleDateString(),
  },
  {
    id: 8,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Reporting of occupational injuries and diseases',
    creator: 'Norwegian Labour Inspection Authority',
    lastChanged: new Date('2023-04-11').toLocaleDateString(),
  },
  {
    id: 9,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for a residence permit',
    creator: 'Norwegian Directorate of Immigration',
    lastChanged: new Date('2023-04-06').toLocaleDateString(),
  },
  {
    id: 10,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for a work permit',
    creator: 'Norwegian Directorate of Immigration',
    lastChanged: new Date('2023-04-15').toLocaleDateString(),
  },
  {
    id: 11,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Notification of change of address',
    creator: 'Norwegian Tax Administration',
    lastChanged: new Date('2023-04-09').toLocaleDateString(),
  },
  {
    id: 12,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for a Norwegian national ID number',
    creator: 'Norwegian Tax Administration',
    lastChanged: new Date('2023-04-02').toLocaleDateString(),
  },
  {
    id: 13,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Reporting of temporary layoffs',
    creator: 'Norwegian Labour and Welfare Administration',
    lastChanged: new Date('2023-04-07').toLocaleDateString(),
  },
  {
    id: 14,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for parental benefit',
    creator: 'Norwegian Labour and Welfare Administration',
    lastChanged: new Date('2023-04-13').toLocaleDateString(),
  },
  {
    id: 15,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Reporting of VAT',
    creator: 'Tax Administration',
    lastChanged: new Date('2023-04-04').toLocaleDateString(),
  },
  {
    id: 16,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for a certificate of good conduct',
    creator: 'Norwegian Police',
    lastChanged: new Date('2023-04-10').toLocaleDateString(),
  },
];
