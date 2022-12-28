import React from 'react';
import type { StyledComponentProps } from '@mui/material';
import { getLanguageFromKey } from '../utils/language';
import { TopToolbarButton } from '@altinn/schema-editor/components/TopToolbarButton';

export interface IFileSelectorProps extends StyledComponentProps {
  language: any;
  submitHandler: (file: FormData, fileName: string) => void;
  busy: boolean;
  formFileName: string;
  accept?: string;
  disabled?: boolean;
  submitButtonRenderer?: (fileInputClickHandler: (event: any) => void) => JSX.Element;
}

function FileSelector({
  language,
  accept,
  formFileName,
  busy,
  disabled,
  submitHandler,
  submitButtonRenderer,
}: IFileSelectorProps) {
  const defaultSubmitButtonRenderer = (fileInputClickHandler: (event: any) => void) => (
    <TopToolbarButton
      data-testid='upload-button'
      faIcon='fa fa-upload'
      iconSize={38}
      hideText={false}
      onClick={fileInputClickHandler}
      disabled={disabled}
      id='file-upload-button'
    >
      {getLanguageFromKey('app_data_modelling.upload_xsd', language)}
    </TopToolbarButton>
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
