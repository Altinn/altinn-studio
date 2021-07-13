import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { Description } from '@material-ui/icons';
import { getLanguageFromKey } from 'app-shared/utils/language';
import theme from 'app-shared/theme/altinnStudioTheme';
import * as React from 'react';
import { Button, StyledComponentProps, withStyles } from '@material-ui/core';
import classNames from 'classnames';

interface IFileInputState {
  selectedFileName: string | undefined;
}
interface IFileInputProps extends StyledComponentProps {
  language: any,
  submitHandler: (file: any) => void;
  busy: boolean;
}
const styles = {
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    '&>*': { margin: 4, height: 36 },
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
class FileInput extends React.Component<IFileInputProps, IFileInputState> {
  fileInput: React.RefObject<HTMLInputElement>;

  constructor(props: IFileInputProps) {
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
    this.props.submitHandler(this.fileInput.current.files[0]);
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
    const { language, busy, classes } = this.props;
    if (busy) {
      return (
        <AltinnSpinner />
      );
    }
    const selectedFileName = this.getFileName();
    return (
      <form onSubmit={this.handleSubmit} className={classes.root}>
        <label htmlFor='xsd-upload-picker' title={getLanguageFromKey('general.select_xsd', language)}>
          <Description fontSize='large' />
          <span
            className={classNames({ empty: !selectedFileName })}
          >
            {selectedFileName || getLanguageFromKey('general.select_xsd', language)}
          </span>
        </label>
        <input
          type="file"
          id='xsd-upload-picker'
          className='sr-only'
          accept='.xsd'
          ref={this.fileInput}
          name="thefile"
          onChange={this.handleInputChange}
        />
        <Button type="submit" disabled={!selectedFileName}>
          {getLanguageFromKey('general.submit_upload', language)}
        </Button>
      </form>
    );
  }
}

export default withStyles(styles)(FileInput);
