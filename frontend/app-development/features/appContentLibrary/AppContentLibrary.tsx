import { ResourceContentLibraryImpl } from '@studio/content-library';
import React from 'react';
import { useOptionListsQuery } from 'app-shared/hooks/queries/useOptionListsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { convertOptionListsToCodeLists } from './utils/convertOptionListsToCodeLists';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useAddOptionListMutation } from 'app-shared/hooks/mutations/useAddOptionListMutation';

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const {
    data: optionLists,
    isPending: optionListsPending,
    isError: optionListsError,
  } = useOptionListsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app);

  if (optionListsPending)
    return <StudioPageSpinner spinnerTitle={t('general.loading')}></StudioPageSpinner>;

  const codeLists = convertOptionListsToCodeLists(optionLists);

  const onSubmit = (file: File) => {
    uploadOptionList(file);
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeLists: codeLists,
          onUpdateCodeList: () => {},
          onUploadCodeList: onSubmit,
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
