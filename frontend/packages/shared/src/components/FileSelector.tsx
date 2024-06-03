import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { UploadIcon } from '@studio/icons';
import { fileSelectorInputId } from '@studio/testing/testids';
import { toast } from 'react-toastify';

export interface IFileSelectorProps {
  accept?: string;
  busy: boolean;
  disabled?: boolean;
  formFileName: string;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
  submitHandler: (file: FormData, fileName: string) => void;
}

export const FileSelector = ({
  accept = undefined,
  busy,
  disabled,
  formFileName,
  submitButtonRenderer,
  submitHandler,
}: IFileSelectorProps) => {
  const { t } = useTranslation();
  const defaultSubmitButtonRenderer = (fileInputClickHandler: (event: any) => void) => (
    <StudioButton
      id='file-upload-button'
      icon={<UploadIcon />}
      onClick={fileInputClickHandler}
      disabled={disabled}
      variant='tertiary'
      size='small'
    >
      {t('app_data_modelling.upload_xsd')}
    </StudioButton>
  );

  const fileInput = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const file = fileInput?.current?.files?.item(0);
    if (!file.name.match(/^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/)) {
      toast.error(t('app_data_modelling.upload_xsd_invalid_error'));
      fileInput.current.value = '';
      return;
    }

    if (file) {
      const formData = new FormData();
      formData.append(formFileName, file);
      submitHandler(formData, file.name);
    }
  };

  const handleInputChange = () => {
    const file = fileInput?.current?.files?.item(0);
    if (file) handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        data-testid={fileSelectorInputId}
        type='file'
        id='file-upload-picker'
        className='sr-only'
        accept={accept}
        ref={fileInput}
        name={formFileName}
        onChange={handleInputChange}
        disabled={busy}
        tabIndex={-1}
      />
      {(submitButtonRenderer ?? defaultSubmitButtonRenderer)(() => fileInput?.current?.click())}
    </form>
  );
};
