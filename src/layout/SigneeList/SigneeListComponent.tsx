import React from 'react';
import { useParams } from 'react-router-dom';

import { Heading } from '@digdir/designsystemet-react';

import { AppTable } from 'src/app-components/Table/Table';
import captionClasses from 'src/components/form/caption/Caption.module.css';
import { Description } from 'src/components/form/Description';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSigneeList } from 'src/layout/SigneeList/api';
import classes from 'src/layout/SigneeList/SigneeListComponent.module.css';
import { SigneeListError } from 'src/layout/SigneeList/SigneeListError';
import { SigneeStateTag } from 'src/layout/SigneeList/SigneeStateTag';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function SigneeListComponent({ baseComponentId }: PropsFromGenericComponent<'SigneeList'>) {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const { langAsString } = useLanguage();
  const componentId = useIndexedId(baseComponentId);

  const { textResourceBindings } = useItemWhenType(baseComponentId, 'SigneeList');

  const { data, isLoading, error } = useSigneeList(instanceOwnerPartyId, instanceGuid, taskId);

  if (error) {
    return <SigneeListError error={error} />;
  }

  return (
    <>
      {textResourceBindings?.title && (
        <div className={captionClasses.tableCaption}>
          <div className={captionClasses.titleAndHelpWrapper}>
            <Heading
              level={3}
              data-size='sm'
            >
              <Lang id={textResourceBindings.title} />
            </Heading>
            {textResourceBindings.help && (
              <HelpTextContainer
                id={componentId}
                helpText={<Lang id={textResourceBindings.help} />}
              />
            )}
          </div>
          {textResourceBindings.description && (
            <Description
              className={captionClasses.description}
              componentId={componentId}
              description={<Lang id={textResourceBindings.description} />}
            />
          )}
        </div>
      )}
      <AppTable
        size='md'
        data={data ?? []}
        isLoading={isLoading}
        emptyText={<Lang id='signee_list.no_signees' />}
        headerClassName={classes.header}
        tableClassName={classes.table}
        tableTestId={baseComponentId}
        ariaLabel={textResourceBindings?.title ? langAsString(textResourceBindings.title) : undefined}
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
    </>
  );
}
