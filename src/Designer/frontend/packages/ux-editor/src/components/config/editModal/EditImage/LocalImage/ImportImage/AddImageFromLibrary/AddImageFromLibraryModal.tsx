import React, { forwardRef } from 'react';
import { StudioDialog, StudioHeading } from '@studio/components';
import { ChooseFromLibrary } from './ChooseFromLibrary/ChooseFromLibrary';
import { useTranslation } from 'react-i18next';
import classes from './AddImageFromLibraryModal.module.css';
import { useGetAllImageFileNamesQuery } from 'app-shared/hooks/queries/useGetAllImageFileNamesQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export interface AddImageFromLibraryModalProps {
  onAddImageReference: (imageName: string) => void;
}

export const AddImageFromLibraryModal = forwardRef<
  HTMLDialogElement,
  AddImageFromLibraryModalProps
>(({ onAddImageReference }, ref): JSX.Element => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: imagesFileNames } = useGetAllImageFileNamesQuery(org, app);

  return (
    <StudioDialog ref={ref} className={imagesFileNames?.length > 0 && classes.dialog}>
      <StudioDialog.Block>
        <StudioHeading level={2}>
          {t('ux_editor.properties_panel.images.choose_from_library_modal_title')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <ChooseFromLibrary onAddImageReference={onAddImageReference} />
      </StudioDialog.Block>
    </StudioDialog>
  );
});

AddImageFromLibraryModal.displayName = 'AddImageFromLibraryModal';
