import React, { useState } from 'react';
import { StudioProperty, StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FileIcon } from '@studio/icons';
import { Alert } from '@digdir/design-system-react';
import classes from './AddPdfButton.module.css';

interface AddPdfButtonProps {
  onAddPdf: (pdfName: string) => void;
}

export const AddPdfButton = ({ onAddPdf }: AddPdfButtonProps): React.ReactNode => {
  const { t } = useTranslation();
  const [pdfNameAssignable, setPdfNameAssignable] = useState<boolean>(false);

  const handleOnBlur = (pdfName: string) => {
    if (pdfName === '') setPdfNameAssignable(false);
    else onAddPdf(pdfName);
  };

  return pdfNameAssignable ? (
    <div className={classes.assignName}>
      <StudioTextfield
        label={t('ux_editor.pages_add_pdf_assign_name')}
        onBlur={({ target }) => handleOnBlur(target.value)}
        size='small'
        autoFocus
      />
      <Alert>{t('ux_editor.pages_add_pdf_info')}</Alert>
    </div>
  ) : (
    <StudioProperty.Button
      onClick={() => setPdfNameAssignable(!pdfNameAssignable)}
      property={t('ux_editor.pages_add_pdf')}
      size='small'
      icon={<FileIcon />}
      //disabled={isAddLayoutMutationPending}
    />
  );
};
