import { Description } from '@material-ui/icons';
import * as React from 'react';
import { Button, StyledComponentProps, withStyles } from '@material-ui/core';
import classNames from 'classnames';
import { getLanguageFromKey } from '../utils/language';
import theme from '../theme/altinnStudioTheme';

interface IFileUploadState {
  selectedFileName: string | undefined;
}
interface IFileUploadProps extends StyledComponentProps {
  language: any,
  submitHandler: (file: FormData, fileName: string) => void;
  busy: boolean;
  labelTextRecource: string;
  formFileName: string;
  accept?: string;
}
const styles = {
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    '&>*': { margin: 4, height: 36 },
    '& input:focus-visible + label': {
      outline: '2px solid black',
    },
    '& label': {
      flex: 1,
      display: 'inline-flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      '& span': {
        flex: 1,
        height: 36,
        padding: 2,
        paddingTop: 5,
        boxSizing: 'border-box',
        border: '1px solid #0062BA',
        '&.empty': {
          fontStyle: 'italic',
          color: 'grey',
        },
      },
    },
    '& button': {
      borderBottom: `1px solid ${theme.altinnPalette.primary.blueDark}`,
      color: theme.altinnPalette.primary.white,
      background: theme.altinnPalette.primary.blueDark,
      textTransform: 'none' as 'none',
      fontSize: 16,
      fontWeight: 400,
      borderRadius: '0',
      '&:hover': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
      '&:focus': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
      '&:disabled': {
        borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
      },
    },
  },
};
class FileUpload extends React.Component<IFileUploadProps, IFileUploadState> {
  fileInput: React.RefObject<HTMLInputElement>;

  constructor(props: IFileUploadProps) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.getFileName = this.getFileName.bind(this);
    this.fileInput = React.createRef();
    this.state = {
      selectedFileName: '',
    };
  }

  handleSubmit(event: any) {
    event.preventDefault();
    const file = this.fileInput.current.files[0];
    const formData = new FormData();
    formData.append(this.props.formFileName, file);
    this.props.submitHandler(formData, file.name);
  }

  handleInputChange(event: any) {
    event.preventDefault();
    this.setState({
      selectedFileName: this.fileInput.current?.files[0]?.name,
    });
  }

  getFileName() {
    return this.state.selectedFileName;
  }

  render() {
    const {
      language, classes, labelTextRecource,
    } = this.props;
    const selectedFileName = this.getFileName();
    return (
      <form onSubmit={this.handleSubmit} className={classes.root}>
        <input
          type='file'
          id='file-upload-picker'
          className='sr-only'
          accept={this.props.accept}
          ref={this.fileInput}
          name={this.props.formFileName}
          onChange={this.handleInputChange}
          disabled={this.props.busy}
        />
        <label htmlFor='file-upload-picker' title={getLanguageFromKey(labelTextRecource, language)}>
          <Description fontSize='large' />
          <span
            className={classNames({ empty: !selectedFileName })}
          >
            {selectedFileName || getLanguageFromKey(labelTextRecource, language)}
          </span>
        </label>
        <Button type='submit' disabled={!selectedFileName || this.props.busy}>
          {getLanguageFromKey('shared.submit_upload', language)}
        </Button>
      </form>
    );
  }
}

export default withStyles(styles)(FileUpload);
