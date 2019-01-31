import { Grid, IconButton, MenuItem, Select } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as diff from 'diff';
import * as React from 'react';
import MonacoEditorComponent from '../../../shared/src/file-editor/MonacoEditorComponent';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';
import AltinnButton from '../components/AltinnButton';
import { get, post } from '../utils/networking';

const theme = createMuiTheme(altinnTheme);

export interface ICodeLanguageItem {
  name: string;
  displayName: string;
}

export interface ICodeLanguage {
  [id: string]: ICodeLanguageItem;
}

const languages: ICodeLanguage = {
  cs: {
    name: 'csharp',
    displayName: 'C#',
  },
  js: {
    name: 'javascript',
    displayName: 'JavaScript',
  },
  ts: {
    name: 'typescript',
    displayName: 'TypeScript',
  },
  json: {
    name: 'json',
    displayName: 'JSON',
  },
  css: {
    name: 'css',
    displayName: 'CSS',
  },
};

export interface IFileEditorProvidedProps {
  boxShadow?: boolean;
  checkRepoStatusAfterSaveFile?: boolean;
  classes: any;
  closeFileEditor?: () => void;
  editorHeight?: string;
  getDataModelSuggestions?: (filterText: string) => any[];
  loadFile?: string;
  mode?: string;
  showSaveButton?: boolean;
  stageAfterSaveFile?: boolean;
}

export interface IFileEditorState {
  availableFiles: string[];
  isLoading: boolean;
  mounted: boolean;
  selectedFile: string;
  value: string;
  valueDiff: boolean;
  valueOriginal: string;
}

const styles = createStyles({
  temp: {
    background: 'blue',
  },
  fileHeader: {
    background: theme.altinnPalette.primary.white,
    borderBottom: '1px solid #C9C9C9',
    marginBottom: '0.1rem',
    paddingLeft: '1.3rem',
    minHeight: '4.4rem',
  },
  boxShadow: {
    background: theme.altinnPalette.primary.white,
    boxShadow: theme.sharedStyles.boxShadow,
  },
  codeEditorContent: {
    minHeight: '100%',
  },
  selectFile: {
    borderBottom: '1px solid' + theme.altinnPalette.primary.blueDark,
    color: theme.altinnPalette.primary.blueDarker,
    fontSize: '1.6rem',
  },
  file: {
    color: theme.altinnPalette.primary.blueDarker,
    fontSize: '1.6rem',
  },
  fileMenuItem: {
    fontSize: '1.6rem',
  },
  selectMenu: {
    paddingRight: '0',
  },
  hideIcon: {
    display: 'none',
  },
  formComponentsBtn: {
    'fontSize': '0.85em',
    'fill': theme.altinnPalette.primary.blue,
    'paddingLeft': '0',
    'marginTop': '0.1em',
    'outline': 'none !important',
    '&:hover': {
      background: 'none',
    },
  },
  specialBtn: {
    fontSize: '0.6em !important',
  },
  footerContent: {
    minHeight: '3em',
    textAlign: 'end',
    color: '#6A6A6A',
    paddingRight: '1.2em',
    paddingBottom: '1.2em',
  },
});

class FileEditor extends React.Component<IFileEditorProvidedProps, IFileEditorState> {
  constructor(props: IFileEditorProvidedProps) {
    super(props);
    this.state = {
      availableFiles: [],
      isLoading: false,
      mounted: false,
      selectedFile: '',
      value: '',
      valueDiff: false,
      valueOriginal: '',
    };
  }

  public componentDidMount() {
    if (this.props.mode) {
      const altinnWindow: IAltinnWindow = window as IAltinnWindow;
      const { org, service } = altinnWindow;
      const servicePath = `${org}/${service}`;
      get(`${altinnWindow.location.origin}/designer/${servicePath}/ServiceDevelopment` +
        `/GetServiceFiles?fileEditorMode=${this.props.mode}`).then((response) => {
          const files = response.split(',');
          this.loadFileContent(files[0]);
          this.setState((prevState: IFileEditorState) => {
            return {
              ...prevState,
              availableFiles: files,
              mounted: true,
            };
          });
        });
    }
  }

  // TODO: The added '../' is temporary in place until loadfil API for unique file is available
  public componentDidUpdate(prevProps: any) {
    if (this.props.loadFile !== prevProps.loadFile) {
      this.setState({
        selectedFile: `../${this.props.loadFile}`,
      });
      this.loadFileContent(`../${this.props.loadFile}`);
    }
  }

  public loadFileContent = (fileName: string) => {
    this.setState({
      isLoading: true,
    });
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const servicePath = `${org}/${service}`;
    get(`${altinnWindow.location.origin}/designer/${servicePath}/ServiceDevelopment` +
      `/GetServiceFile?fileEditorMode=${this.props.mode}&fileName=${fileName}`)
      .then((logicFileContent) => {
          this.setState((prevState: IFileEditorState) => {
            return {
              ...prevState,
              isLoading: false,
              selectedFile: fileName,
              value: logicFileContent,
              valueOriginal: logicFileContent,
            };
          });

      });
  }

  public switchFile = (e: any) => {
    const fileName = e.target.value;
    this.loadFileContent(fileName);
  }

  public saveFile = async (e: any) => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service } = altinnWindow;
    const servicePath = `${org}/${service}`;
    const postUrl = `${altinnWindow.location.origin}/designer/${servicePath}/ServiceDevelopment` +
      `/SaveServiceFile?fileEditorMode=${this.props.mode}&fileName=${this.state.selectedFile}&SaveServiceFile=false`;

    const saveRes: any = await post(postUrl, this.state.value, {
      headers: {
        'Content-type': 'text/plain;charset=utf-8',
      },
    });

    if (saveRes.isSuccessStatusCode === false) {
      console.error('save error', saveRes);

    } else if (this.props.stageAfterSaveFile === true) {

      const stageUrl = `${altinnWindow.location.origin}` +
        `/designerapi/Repository/StageChange?` +
        `owner=${org}&repository=${service}&fileName=${this.state.selectedFile.replace(/^\.{2}\//, '')}`;
      const stageRes = await get(stageUrl);

      if (stageRes.isSuccessStatusCode === false) {
        console.error('stage error', stageRes);
      }

    }

    if (this.props.checkRepoStatusAfterSaveFile === true) {
      window.postMessage('forceRepoStatusCheck', window.location.href);
    }

    if (this.state.mounted && this.props.closeFileEditor) {
      this.props.closeFileEditor();
    }

  }
  public createCompletionSuggestions = (monaco: any, filterText: string): any[] => {
    const dataModelSuggestions = this.props.getDataModelSuggestions ?
      this.props.getDataModelSuggestions(filterText) : [];
    const suggestions = dataModelSuggestions.map((item: any) => {
      return {
        label: item.Name,
        kind: monaco.languages.CompletionItemKind.Field,
        description: item.DisplayString,
        insertText: item.Name,
      };
    });

    return suggestions;
  }

  public onValueChange = (value: string) => {
    this.setState((prevState: IFileEditorState) => {
      return {
        ...prevState,
        value,
      };
    });

    if (diff.diffChars(this.state.value, this.state.valueOriginal).length > 1) {

      // If diff, and valueDiff is changed, change state

      if (this.state.valueDiff === false) {
        this.setState({
          valueDiff: true,
        });
      }

    } else {

      if (this.state.valueDiff === true) {
        this.setState({
          valueDiff: false,
        });
      }

    }
  }

  public getLanguageFromFileName = (): any => {
    if (this.state.selectedFile && this.state.selectedFile.length > 1) {
      const splitFileName = this.state.selectedFile.split('.');
      const extension = splitFileName[splitFileName.length - 1];
      if (languages[extension]) {
        return languages[extension];
      }
    }
    return { name: null, displayName: null };
  }

  public renderCloseButton = (): JSX.Element => {
    return (
      <Grid
        item={true}
        xs={1}
        className={this.props.classes.fileHeader}
      >
        <IconButton
          type='button'
          className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
          onClick={this.props.closeFileEditor}
        >
          <i className='ai ai-circlecancel' />
        </IconButton>
        <IconButton
          type='button'
          className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
          onClick={this.saveFile}
        >
          <i className='ai ai-circlecheck' />
        </IconButton>
      </Grid>
    );
  }

  public renderSaveButton = (): JSX.Element => {
    return (
      <Grid
        item={true}
        xs={true}
        container={true}
        justify='flex-end'
        alignItems='center'
      >
        <Grid
          item={true}
        >
          <AltinnButton
            btnText='Lagre fil'
            disabled={!this.state.valueDiff}
            onClickFunction={this.saveFile}
            secondaryButton={true}
          />
        </Grid>
      </Grid>
    );
  }

  public render() {
    const { classes, mode } = this.props;
    const language: ICodeLanguageItem = this.getLanguageFromFileName();

    return (
      <Grid
        container={true}
        className={
          classNames(classes.codeEditorContent, {
            [classes.boxShadow]: this.props.boxShadow,
          })
        }
      >
        <Grid
          item={true}
          xs={true}
          container={true}
          justify='flex-start'
          alignItems='center'
          className={classes.fileHeader}
        >
          <Grid
            item={true}
            xs={true}
          >
            <span>
              {/* If this.props.loadFile is present,
              * if loadFile contains directories then split and show,
              * else show the 'mode' location from 'foldertext'.
              */}
              {this.props.loadFile ?
                this.props.loadFile.split('/').map((folder, index) => {
                  {/* If one or last element, return without expand icon */ }
                  if (this.props.loadFile.split('/').length === index + 1) {
                    return (
                      <React.Fragment key={index}>
                        <span className={classes.file}>
                          {folder}
                        </span>
                      </React.Fragment>
                    );
                  }
                  {/* Return folder with expand icon */ }
                  return (
                    <React.Fragment key={index}>
                      {folder} <i className='ai ai-expand' style={{ fontSize: '2rem' }} />
                    </React.Fragment>
                  );
                })

                :

                <React.Fragment>
                  <i className='ai ai-expand' style={{ fontSize: '2rem' }} />
                </React.Fragment>

              }

              {/* If this.props.mode is present, show select*/}
              {this.props.mode ?

                <React.Fragment>
                  {mode} <i className='ai ai-expand' style={{ fontSize: '2rem' }} />
                  <Select
                    value={this.state.selectedFile}
                    classes={
                      {
                        root: classNames(classes.selectFile),
                        icon: classNames(classes.hideIcon),
                        selectMenu: classNames(classes.selectMenu),
                      }
                    }
                    onChange={this.switchFile}
                  >
                    {this.state.availableFiles.map((file: string) => {
                      return (
                        <MenuItem
                          value={file}
                          key={file}
                          className={classes.fileMenuItem}
                        >
                          {file}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </React.Fragment>

                :

                null
              }
            </span>
          </Grid>

          {/* Contains grid items */}
          {this.props.showSaveButton ? this.renderSaveButton() : null}
          {/* Contains grid items */}
          {this.props.closeFileEditor ? this.renderCloseButton() : null}

        </Grid>
        <Grid
          item={true}
          xs={12}
          className={classes.codeEditorContent}
        >
          <MonacoEditorComponent
            createCompletionSuggestions={this.createCompletionSuggestions}
            heightPx={`${this.props.editorHeight}px`}
            isLoading={this.state.isLoading}
            language={language.name}
            onValueChange={this.onValueChange}
            value={this.state.value}
          />
        </Grid>
        <Grid className={classes.footerContent} item={true} xs={11} />
        <Grid className={classes.footerContent} item={true} xs={1}>
          <span>{language.displayName}</span>
        </Grid>
      </Grid >
    );
  }
}

export default withStyles(styles, { withTheme: true })(FileEditor);
