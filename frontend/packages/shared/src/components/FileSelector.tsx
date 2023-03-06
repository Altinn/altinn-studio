import React from 'react';
import type { StyledComponentProps } from '@mui/material';
import { TopToolbarButton } from '@altinn/schema-editor/components/TopToolbarButton';
import { useTranslation } from 'react-i18next';
import { Button } from '@digdir/design-system-react';
import { Upload } from '@navikt/ds-icons';

export interface IFileSelectorProps extends StyledComponentProps {
  submitHandler: (file: FormData, fileName: string) => void;
  busy: boolean;
  formFileName: string;
  accept?: string;
  disabled?: boolean;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
}

function FileSelector({
  accept,
  formFileName,
  busy,
  disabled,
  submitHandler,
  submitButtonRenderer,
}: IFileSelectorProps) {
  const { t } = useTranslation();
  const defaultSubmitButtonRenderer = (fileInputClickHandler: (event: any) => void) => (
    <Button
      id='file-upload-button'
      data-testid='upload-button'
      icon={<Upload />}
      onClick={fileInputClickHandler}
      disabled={disabled}
    >
      {t('app_data_modelling.upload_xsd')}
    </Button>
  );

  const fileInput = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const file = fileInput?.current?.files?.item(0);
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
        data-testid='FileSelector-input'
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
}

export default FileSelector;
FileSelector.defaultProps = {
  accept: undefined,
};
