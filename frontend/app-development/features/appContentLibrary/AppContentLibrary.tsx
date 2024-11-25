import type { CodeListWithMetadata } from '@studio/content-library';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import React from 'react';
import { useOptionListsQuery } from 'app-shared/hooks/queries/useOptionListsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { convertOptionListsToCodeLists } from './utils/convertOptionListsToCodeLists';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useAddOptionListMutation, useUpdateOptionListMutation } from 'app-shared/hooks/mutations';

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const {
    data: optionLists,
    isPending: optionListsPending,
    isError: optionListsError,
  } = useOptionListsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app);
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);

  if (optionListsPending)
    return <StudioPageSpinner spinnerTitle={t('general.loading')}></StudioPageSpinner>;

  const codeLists = convertOptionListsToCodeLists(optionLists);

  const handleUpload = (file: File) => {
    uploadOptionList(file);
  };

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata) => {
    updateOptionList({ optionListId: title, optionsList: codeList });
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeLists: codeLists,
          onUpdateCodeList: handleUpdate,
          onUploadCodeList: handleUpload,
          fetchDataError: optionListsError,
        },
      },
      images: {
        props: {
          images: [],
          onUpdateImage: () => {},
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
}
