import React from 'react';
import { StyledComponentProps } from '@material-ui/core';
import { getLanguageFromKey } from '../utils/language';
import { TopToolbarButton } from '../../packages/schema-editor/src/components/TopToolbarButton';
import { AltinnButton } from "app-shared/components/index";

export interface IFileSelectorProps extends StyledComponentProps {
  language: any;
  submitHandler: (file: FormData, fileName: string) => void;
  busy: boolean;
  labelTextResource: string;
  formFileName: string;
  accept?: string;
  isInTopToolbar?: boolean;
}

function FileSelector(props: IFileSelectorProps) {
  const {
    language,
    labelTextResource,
    accept,
    formFileName,
    busy,
    submitHandler,
    isInTopToolbar
  } = props;
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
      {isInTopToolbar ? (
        <TopToolbarButton
          data-testid='upload-button'
          faIcon='fa fa-upload'
          iconSize={38}
          hideText={true}
          onClick={() => fileInput?.current?.click()}
        >
          {getLanguageFromKey(labelTextResource, language)}
        </TopToolbarButton>
      ) : (
        <AltinnButton
          onClickFunction={() => fileInput?.current?.click()}
          btnText={getLanguageFromKey(labelTextResource, language)}
        />
      )}
    </form>
  );
}

export default FileSelector;
FileSelector.defaultProps = {
  accept: undefined,
};
