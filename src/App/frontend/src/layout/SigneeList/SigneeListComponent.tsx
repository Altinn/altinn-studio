import React from 'react';
import { useParams } from 'react-router';

import { AppTable, Description, HelpTextContainer } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Heading } from '@digdir/designsystemet-react';

import captionClasses from 'src/components/form/caption/Caption.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSigneeList } from 'src/layout/SigneeList/api';
import classes from 'src/layout/SigneeList/SigneeListComponent.module.css';
import { SigneeListError } from 'src/layout/SigneeList/SigneeListError';
import { SigneeStateTag } from 'src/layout/SigneeList/SigneeStateTag';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function SigneeListComponent({ baseComponentId }: PropsFromGenericComponent<'SigneeList'>) {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const { langAsString } = useLanguage();
  const componentId = useIndexedId(baseComponentId);

  const config = useComponentConfig(baseComponentId, 'SigneeList');
  const title = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.SigneeList.textResourceBindings.title,
  );
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.SigneeList.textResourceBindings.help);
  const description = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.SigneeList.textResourceBindings.description,
  );

  const { data, isLoading, error } = useSigneeList(instanceOwnerPartyId, instanceGuid, taskId);

  if (error) {
    return <SigneeListError error={error} />;
  }

  return (
    <>
      {(config.textResourceBindings?.title === undefined ? undefined : title) && (
        <div className={captionClasses.tableCaption}>
          <div className={captionClasses.titleAndHelpWrapper}>
            <Heading
              level={3}
              data-size='sm'
            >
              <Lang id={config.textResourceBindings?.title === undefined ? undefined : title} />
            </Heading>
            {(config.textResourceBindings?.help === undefined ? undefined : help) && (
              <HelpTextContainer
                id={componentId}
                helpText={<Lang id={config.textResourceBindings?.help === undefined ? undefined : help} />}
              />
            )}
          </div>
          {(config.textResourceBindings?.description === undefined ? undefined : description) && (
            <Description
              className={captionClasses.description}
              componentId={componentId}
              description={
                <Lang id={config.textResourceBindings?.description === undefined ? undefined : description} />
              }
            />
          )}
        </div>
      )}
      <AppTable
        size='md'
        data={data ?? []}
        isLoading={isLoading}
        emptyText={langAsString('signee_list.no_signees')}
        headerClassName={classes.header}
        tableClassName={classes.table}
        tableTestId={baseComponentId}
        ariaLabel={
          (config.textResourceBindings?.title === undefined ? undefined : title)
            ? langAsString(config.textResourceBindings?.title === undefined ? undefined : title)
            : undefined
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
    </>
  );
}
