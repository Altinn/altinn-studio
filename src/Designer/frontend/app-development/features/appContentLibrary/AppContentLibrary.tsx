import type {
  CodeListData,
  CodeListReference,
  CodeListWithMetadata,
  TextResourceWithLanguage,
} from 'libs/studio-content-library/src';
import { ResourceContentLibraryImpl } from 'libs/studio-content-library/src';
import type { ReactElement } from 'react';
import React, { useCallback } from 'react';

import {
  useOptionListsQuery,
  useOptionListsReferencesQuery,
  useTextResourcesQuery,
} from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { mapToCodeListDataList } from './utils/mapToCodeListDataList';
import { StudioPageError, StudioPageSpinner } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import {
  useAddOptionListMutation,
  useUpdateOptionListMutation,
  useUpdateOptionListIdMutation,
  useDeleteOptionListMutation,
  useUpsertTextResourceMutation,
} from 'app-shared/hooks/mutations';
import { mapToCodeListUsages } from './utils/mapToCodeListUsages';
import type { OptionListData } from 'app-shared/types/OptionList';
import type { OptionListReferences } from 'app-shared/types/OptionListReferences';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import type { ITextResources } from 'app-shared/types/global';
import { convertTextResourceToMutationArgs } from './utils/convertTextResourceToMutationArgs';
import { useGetAvailableOrgResourcesQuery } from '../../hooks/queries/useGetAvailableOrgResourcesQuery';
import { useImportCodeListFromOrgToAppMutation } from '../../hooks/mutations/useImportCodeListFromOrgToAppMutation';
import type { ExternalResource } from 'app-shared/types/ExternalResource';

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: optionListDataList, status: optionListDataListStatus } = useOptionListsQuery(
    org,
    app,
  );
  const { data: optionListUsages, status: optionListUsagesStatus } = useOptionListsReferencesQuery(
    org,
    app,
  );
  const { data: textResources, status: textResourcesStatus } = useTextResourcesQuery(org, app);
  const { data: availableOrgResources, status: availableOrgResourcesStatus } =
    useGetAvailableOrgResourcesQuery(org);

  const status = mergeQueryStatuses(
    optionListDataListStatus,
    optionListUsagesStatus,
    textResourcesStatus,
    availableOrgResourcesStatus,
  );

  switch (status) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return <StudioPageError message={t('app_content_library.fetch_error')} />;
    case 'success':
      return (
        <AppContentLibraryWithData
          optionListDataList={optionListDataList}
          optionListUsages={optionListUsages}
          textResources={textResources}
          availableOrgResources={availableOrgResources}
        />
      );
  }
}

type AppContentLibraryWithDataProps = {
  optionListDataList: OptionListData[];
  optionListUsages: OptionListReferences;
  textResources: ITextResources;
  availableOrgResources?: ExternalResource[];
};

function AppContentLibraryWithData({
  optionListDataList,
  optionListUsages,
  textResources,
  availableOrgResources = [],
}: AppContentLibraryWithDataProps): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const { mutate: updateOptionListId } = useUpdateOptionListIdMutation(org, app);
  const { mutate: deleteOptionList } = useDeleteOptionListMutation(org, app);
  const { mutate: updateTextResource } = useUpsertTextResourceMutation(org, app);
  const { mutate: importCodeListFromOrg } = useImportCodeListFromOrgToAppMutation(org, app);
  const { t } = useTranslation();

  const handleUpload = useUploadOptionList(org, app);

  const codeListDataList: CodeListData[] = mapToCodeListDataList(optionListDataList);

  const codeListsUsages: CodeListReference[] = mapToCodeListUsages(optionListUsages);

  const handleUpdateCodeListId = (optionListId: string, newOptionListId: string): void => {
    updateOptionListId({ optionListId, newOptionListId });
  };

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata): void => {
    updateOptionList({ optionListId: title, optionList: codeList });
  };

  const handleCreate = ({ title, codeList }: CodeListWithMetadata): void => {
    // OptionsController uses PUT for both creating and updating code lists
    updateOptionList({ optionListId: title, optionList: codeList });
  };

  const handleImportCodeListFromOrg = (codeListId: string): void => {
    importCodeListFromOrg(codeListId);
  };

  const handleUpdateTextResource = useCallback(
    (textResourceWithLanguage: TextResourceWithLanguage): void => {
      const mutationArgs = convertTextResourceToMutationArgs(textResourceWithLanguage);
      updateTextResource(mutationArgs);
    },
    [updateTextResource],
  );

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    heading: t('app_content_library.library_heading'),
    pages: {
      codeList: {
        props: {
          codeListDataList,
          onCreateCodeList: handleCreate,
          onDeleteCodeList: deleteOptionList,
          onUpdateCodeListId: handleUpdateCodeListId,
          onUpdateCodeList: handleUpdate,
          onCreateTextResource: handleUpdateTextResource,
          onUpdateTextResource: handleUpdateTextResource,
          onUploadCodeList: handleUpload,
          codeListsUsages,
          textResources,
          externalResources: availableOrgResources,
          onImportCodeListFromOrg: handleImportCodeListFromOrg,
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

function useUploadOptionList(org: string, app: string): (file: File) => void {
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => isErrorUnknown(error),
  });
  const { t } = useTranslation();

  return useCallback(
    (file: File) =>
      uploadOptionList(file, {
        onSuccess: () => {
          toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
        },
        onError: (error: AxiosError<ApiError>) => {
          if (isErrorUnknown(error)) {
            toast.error(t('ux_editor.modal_properties_code_list_upload_generic_error'));
          }
        },
      }),
    [uploadOptionList, t],
  );
}
