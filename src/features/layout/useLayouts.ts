import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLayoutSetIdForApplication } from 'src/utils/appMetadata';

export function useCurrentLayoutSetId() {
  return useAppSelector((state) =>
    getLayoutSetIdForApplication(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
      state.formLayout.layoutsets,
    ),
  );
}
