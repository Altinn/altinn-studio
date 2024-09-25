import React, { forwardRef } from 'react';
import { StudioModal } from '@studio/components';
import { ChooseFromLibrary } from './ChooseFromLibrary';
import { useTranslation } from 'react-i18next';
import { useForwardedRef } from '@studio/hooks';
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
  const dialogRef = useForwardedRef<HTMLDialogElement>(ref);
  const { org, app } = useStudioEnvironmentParams();
  const { data: imagesFileNames } = useGetAllImageFileNamesQuery(org, app);

  return (
    <StudioModal.Dialog
      closeButtonTitle={t('general.close')}
      heading={t('ux_editor.properties_panel.images.choose_from_library_modal_title')}
      ref={dialogRef}
      className={imagesFileNames?.length > 0 && classes.dialog}
    >
      <ChooseFromLibrary onAddImageReference={onAddImageReference} />
    </StudioModal.Dialog>
  );
});

AddImageFromLibraryModal.displayName = 'AddImageFromLibraryModal';
