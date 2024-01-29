import React from 'react';
import { Combobox, Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery'; //Why is this path different from useAppMetadataQuery?
import { useAppContext } from '../../../../hooks/useAppContext';

export const AttachmentListComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  // const selectedLayout = useSelectedFormLayoutSelector();
  // console.log(selectedLayout);
  const { org, app } = useStudioUrlParams();
  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);
  const { selectedLayoutSet } = useAppContext();
  console.log(selectedLayoutSet);
  console.log(appMetadataStatus, appMetadata, appMetadataError);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  console.log(layoutSets);
  const dataTypes =
    appMetadata?.dataTypes?.map((dataType) => !dataType.appLogic && dataType.id) ?? []; // TODO: Remove dataTypes that is "dataType for the layoutSet" such as message, changename, group, likert and datalist
  console.log(dataTypes);

  return (
    <>
      <Switch />
      <Combobox multiple>
        {dataTypes.map((dataType) => {
          return (
            <Combobox.Option
              key={dataType}
              value={dataType}
              description={dataType === 'ref-data-as-pdf' ? 'PDF' : dataType}
              displayValue={dataType}
            />
          );
        })}
      </Combobox>
    </>
  );
};
