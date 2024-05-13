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
    lastChanged: '12-04-2023',
  },
  {
    id: 2,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for authorisation and license as a healthcare personnel',
    creator: 'The Norwegian Directorate of Health',
    lastChanged: '05-04-2023',
  },
  {
    id: 3,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Produkter og tjenester fra Brønnøysundregistrene',
    creator: 'Brønnøysund Register Centre',
    lastChanged: '16-04-2023',
  },
  {
    id: 4,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Contact form - Norwegian Tax Administration (private individual)',
    creator: 'Tax Administration',
    lastChanged: '08-04-2023',
  },
  {
    id: 5,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Contact form - Norwegian Tax Administration (commercial)',
    creator: 'Tax Administration',
    lastChanged: '01-04-2023',
  },
  {
    id: 6,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'A-melding – all forms',
    creator: 'Brønnøysund Register Centre',
    lastChanged: '14-04-2023',
  },
  {
    id: 7,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for VAT registration',
    creator: 'Tax Administration',
    lastChanged: '03-04-2023',
  },
  {
    id: 8,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Reporting of occupational injuries and diseases',
    creator: 'Norwegian Labour Inspection Authority',
    lastChanged: '11-04-2023',
  },
  {
    id: 9,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for a residence permit',
    creator: 'Norwegian Directorate of Immigration',
    lastChanged: '06-04-2023',
  },
  {
    id: 10,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for a work permit',
    creator: 'Norwegian Directorate of Immigration',
    lastChanged: '15-04-2023',
  },
  {
    id: 11,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Notification of change of address',
    creator: 'Norwegian Tax Administration',
    lastChanged: '09-04-2023',
  },
  {
    id: 12,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for a Norwegian national ID number',
    creator: 'Norwegian Tax Administration',
    lastChanged: '02-04-2023',
  },
  {
    id: 13,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Reporting of temporary layoffs',
    creator: 'Norwegian Labour and Welfare Administration',
    lastChanged: '07-04-2023',
  },
  {
    id: 14,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for parental benefit',
    creator: 'Norwegian Labour and Welfare Administration',
    lastChanged: '13-04-2023',
  },
  {
    id: 15,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Reporting of VAT',
    creator: 'Tax Administration',
    lastChanged: '04-04-2023',
  },
  {
    id: 16,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for a certificate of good conduct',
    creator: 'Norwegian Police',
    lastChanged: '10-04-2023',
  },
];
