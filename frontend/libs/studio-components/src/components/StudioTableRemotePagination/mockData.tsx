import { Button } from '@digdir/designsystemet-react';
import { StarFillIcon, StarIcon } from '@navikt/aksel-icons';
import React from 'react';
import type { PaginationTexts, Rows } from './StudioTableRemotePagination';
import classes from './mockData.module.css';

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
    heading: '',
  },
  {
    accessor: 'name',
    heading: 'Name',
    sortable: true,
  },
  {
    accessor: 'creator',
    heading: 'Created by',
  },
  {
    accessor: 'lastChanged',
    heading: 'Last changed',
    sortable: true,
    headerCellClass: classes.lastChangedColumnWidth,
    bodyCellClass: 'someOtherCustomClass',
    bodyCellFormatter: (date: string) =>
      new Date(date).toLocaleDateString('nb', { dateStyle: 'short' }),
  },
];

export const rows: Rows = [
  {
    id: 1,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Coordinated register notification',
    creator: 'Brønnøysund Register Centre',
    lastChanged: '2023-04-12',
  },
  {
    id: 2,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for authorisation and license as a healthcare personnel',
    creator: 'The Norwegian Directorate of Health',
    lastChanged: '2023-04-05',
  },
  {
    id: 3,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Produkter og tjenester fra Brønnøysundregistrene',
    creator: 'Brønnøysund Register Centre',
    lastChanged: '2023-04-16',
  },
  {
    id: 4,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Contact form - Norwegian Tax Administration (private individual)',
    creator: 'Tax Administration',
    lastChanged: '2023-04-08',
  },
  {
    id: 5,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Contact form - Norwegian Tax Administration (commercial)',
    creator: 'Tax Administration',
    lastChanged: '2023-04-01',
  },
  {
    id: 6,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'A-melding – all forms',
    creator: 'Brønnøysund Register Centre',
    lastChanged: '2023-04-14',
  },
  {
    id: 7,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for VAT registration',
    creator: 'Tax Administration',
    lastChanged: '2023-04-03',
  },
  {
    id: 8,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Reporting of occupational injuries and diseases',
    creator: 'Norwegian Labour Inspection Authority',
    lastChanged: '2023-04-11',
  },
  {
    id: 9,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for a residence permit',
    creator: 'Norwegian Directorate of Immigration',
    lastChanged: '2023-04-06',
  },
  {
    id: 10,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for a work permit',
    creator: 'Norwegian Directorate of Immigration',
    lastChanged: '2023-04-15',
  },
  {
    id: 11,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Notification of change of address',
    creator: 'Norwegian Tax Administration',
    lastChanged: '2023-04-09',
  },
  {
    id: 12,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for a Norwegian national ID number',
    creator: 'Norwegian Tax Administration',
    lastChanged: '2023-04-02',
  },
  {
    id: 13,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Reporting of temporary layoffs',
    creator: 'Norwegian Labour and Welfare Administration',
    lastChanged: '2023-04-07',
  },
  {
    id: 14,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Application for parental benefit',
    creator: 'Norwegian Labour and Welfare Administration',
    lastChanged: '2023-04-13',
  },
  {
    id: 15,
    icon: <IconButton icon={<StarFillIcon />} />,
    name: 'Reporting of VAT',
    creator: 'Tax Administration',
    lastChanged: '2023-04-04',
  },
  {
    id: 16,
    icon: <IconButton icon={<StarIcon />} />,
    name: 'Application for a certificate of good conduct',
    creator: 'Norwegian Police',
    lastChanged: '2023-04-10',
  },
];

export const paginationTexts: PaginationTexts = {
  pageSizeLabel: 'Rows per page:',
  totalRowsText: 'Total number of rows:',
  nextButtonAriaLabel: 'Next',
  previousButtonAriaLabel: 'Previous',
  numberButtonAriaLabel: (num) => `Page ${num}`,
};

export const emptyTableFallback = 'No rows to display';
