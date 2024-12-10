import type { CodeListWithMetadata } from '@studio/content-library';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useAddOptionListMutation, useUpdateOptionListMutation } from 'app-shared/hooks/mutations';
import { useOptionListIdsQuery } from '@altinn/ux-editor/hooks/queries/useOptionListIdsQuery';
import { useGetOptionListQuery } from 'app-shared/hooks/queries';

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: optionListIds, isPending: optionListIdsPending } = useOptionListIdsQuery(org, app);
  const getOptionList = useGetOptionListQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app);
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);

  if (optionListIdsPending)
    return <StudioPageSpinner spinnerTitle={t('general.loading')}></StudioPageSpinner>;

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
          codeListIds: optionListIds,
          getCodeList: getOptionList,
          onUpdateCodeList: handleUpdate,
          onUploadCodeList: handleUpload,
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
