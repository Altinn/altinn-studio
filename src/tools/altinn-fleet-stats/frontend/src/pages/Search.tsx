import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Heading, Textfield } from '@digdir/designsystemet-react';
import { api } from '../lib/api';
import { Table } from '../components/Table';

export function SearchPage() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');

  const r = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => api.search(submitted),
    enabled: submitted.length >= 2,
  });

  return (
    <div className='space-y-4'>
      <Heading level={2} data-size='sm'>
        Søk
      </Heading>
      <form
        className='flex items-end gap-2'
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <div className='flex-1'>
          <Textfield
            label='Søketerm'
            description='Søk på app-navn, optionsId, komponenttype eller repo-url'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='ASF_Land, Map, krt-1003a-1, ...'
          />
        </div>
        <Button type='submit' data-color='accent' variant='primary'>
          Søk
        </Button>
      </form>
      <Table
        loading={r.isFetching && r.isLoading}
        rows={r.data ?? []}
        cols={[
          { key: 'app_id', header: 'App' },
          { key: 'org', header: 'Org' },
          { key: 'backend_version', header: 'Backend' },
          { key: 'page_count', header: 'Sider', align: 'right' },
          { key: 'component_count', header: 'Komponenter', align: 'right' },
        ]}
        emptyTitle={submitted ? `Ingen treff på «${submitted}»` : 'Skriv inn et søkeord'}
        emptyDescription={
          submitted
            ? 'Prøv en annen term — søket matcher app-navn, org, optionsId, komponenttype eller repo-url.'
            : 'Eksempler: «ASF_Land», «Map», «krt-1003a-1».'
        }
      />
    </div>
  );
}
