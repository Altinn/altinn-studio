import React from 'react';
import { useParams } from 'react-router-dom';

import { AppTable } from 'src/app-components/Table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSigneeList } from 'src/layout/SigneeList/api';
import classes from 'src/layout/SigneeList/SigneeListComponent.module.css';
import { SigneeListError } from 'src/layout/SigneeList/SigneeListError';
import { SigneeStateTag } from 'src/layout/SigneeList/SigneeStateTag';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function SigneeListComponent({ baseComponentId }: PropsFromGenericComponent<'SigneeList'>) {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const { langAsString } = useLanguage();

  const { textResourceBindings } = useItemWhenType(baseComponentId, 'SigneeList');

  const { data, isLoading, error } = useSigneeList(instanceOwnerPartyId, instanceGuid, taskId);

  if (error) {
    return <SigneeListError error={error} />;
  }

  return (
    <AppTable
      size='md'
      data={data ?? []}
      isLoading={isLoading}
      emptyText={<Lang id='signee_list.no_signees' />}
      headerClassName={classes.header}
      tableClassName={classes.table}
      caption={
        textResourceBindings?.title ? (
          <Caption
            title={<Lang id={textResourceBindings?.title} />}
            description={<Lang id={textResourceBindings?.description} />}
            helpText={textResourceBindings?.help ? { text: textResourceBindings?.help } : undefined}
            designSystemLabelProps={{ 'data-size': 'lg' }}
          />
        ) : undefined
      }
      columns={[
        {
          header: langAsString('signee_list.header_name'),
          accessors: ['name'],
          renderCell: (value) => value.toString(),
        },
        {
          header: langAsString('signee_list.header_on_behalf_of'),
          accessors: ['organization'],
          renderCell: (value) => value.toString(),
        },
        {
          header: langAsString('signee_list.header_status'),
          accessors: [],
          renderCell: (_, rowData) => <SigneeStateTag state={rowData} />,
        },
      ]}
    />
  );
}
