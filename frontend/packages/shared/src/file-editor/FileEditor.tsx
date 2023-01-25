import React from 'react';
import { Grid, IconButton, MenuItem, Select } from '@mui/material';
import classNames from 'classnames';
import { diffChars } from 'diff';
import MonacoEditorComponent from './MonacoEditorComponent';
import AltinnButton from '../components/AltinnButton';
import { get, post } from '../utils/networking';
import postMessages from '../utils/postMessages';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';
import { getServiceFilePath, getServiceFilesPath, saveServiceFilePath } from '../api-paths';
import classes from './FileEditor.module.css';

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
  fileEditorCancelRef: React.RefObject<HTMLDivElement>;
  fileEditorSaveRef: React.RefObject<HTMLDivElement>;
}

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
      fileEditorCancelRef: React.createRef<HTMLDivElement>(),
      fileEditorSaveRef: React.createRef<HTMLDivElement>(),
    };
  }

  public componentDidMount() {
    if (!this.props.loadFile) {
      const { org, app } = _useParamsClassCompHack();
      get(getServiceFilesPath(org, app, this.props.mode)).then((response) => {
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

  public componentDidUpdate(prevProps: any) {
    if (this.props.loadFile !== prevProps.loadFile) {
      this.setState({
        selectedFile: `${this.props.loadFile}`,
      });
      this.loadFileContent(`${this.props.loadFile}`);
    }
  }

  public loadFileContent = (fileName: string) => {
    this.setState({
      isLoading: true,
    });
    const { org, app } = _useParamsClassCompHack();
    get(getServiceFilePath(org, app, this.props.mode, fileName)).then((logicFileContent) => {
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
  };

  public switchFile = (e: any) => {
    const fileName = e.target.value;
    this.loadFileContent(fileName);
  };

  public saveFile = async (_e: any) => {
    let stageFile = false;
    if (
      this.props.stageAfterSaveFile === true &&
      this.valueHasNoMergeConflictTags(this.state.value)
    ) {
      stageFile = true;
    }
    const { org, app } = _useParamsClassCompHack();
    const saveRes: any = await post(
      saveServiceFilePath(org, app, this.props.mode, this.state.selectedFile, stageFile),
      this.state.value,
      {
        headers: {
          'Content-type': 'text/plain;charset=utf-8',
        },
      }
    );

    if (saveRes.isSuccessStatusCode === false) {
      console.error('save error', saveRes);
    }

    if (this.props.checkRepoStatusAfterSaveFile === true) {
      window.postMessage(postMessages.forceRepoStatusCheck, window.location.href);
    }

    if (this.state.mounted && this.props.closeFileEditor) {
      this.props.closeFileEditor();
    }
  };
  public createCompletionSuggestions = (monaco: any, filterText: string): any[] => {
    const dataModelSuggestions = this.props.getDataModelSuggestions
      ? this.props.getDataModelSuggestions(filterText)
      : [];
    return dataModelSuggestions.map((item: any) => {
      return {
        label: item.Name,
        kind: monaco.languages.CompletionItemKind.Field,
        description: item.DisplayString,
        insertText: item.Name,
      };
    });
  };

  public onValueChange = (value: string) => {
    this.setState((prevState: IFileEditorState) => {
      return {
        ...prevState,
        value,
      };
    });

    if (diffChars(this.state.value, this.state.valueOriginal).length > 1) {
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
  };

  public getLanguageFromFileName = (): any => {
    if (this.state.selectedFile && this.state.selectedFile.length > 1) {
      const splitFileName = this.state.selectedFile.split('.');
      const extension = splitFileName[splitFileName.length - 1];
      if (languages[extension]) {
        return languages[extension];
      }
    }
    return { name: null, displayName: null };
  };

  public renderCloseButton = (): JSX.Element => {
    return (
      <Grid item={true} xs={1} className={classes.fileHeader}>
        <IconButton
          type='button'
          className={`${classes.formComponentsBtn} ${classes.specialBtn}`}
          onClick={this.props.closeFileEditor}
          tabIndex={0}
        >
          <i
            className='fa fa-circlecancel'
            ref={this.state.fileEditorCancelRef}
            id='fileEditorCancel'
          />
        </IconButton>
        <IconButton
          type='button'
          className={`${classes.formComponentsBtn} ${classes.specialBtn}`}
          onClick={this.saveFile}
          tabIndex={0}
        >
          <i className='fa fa-circlecheck' id='fileEditorCheck' />
        </IconButton>
      </Grid>
    );
  };

  public renderSaveButton = (): JSX.Element => {
    return (
      <Grid item={true} xs={true} container={true} justifyContent='flex-end' alignItems='center'>
        <Grid item={true}>
          <div ref={this.state.fileEditorSaveRef}>
            <AltinnButton
              btnText='Lagre fil'
              disabled={!this.state.valueDiff}
              onClickFunction={this.saveFile}
              secondaryButton={true}
            />
          </div>
        </Grid>
      </Grid>
    );
  };

  public valueHasNoMergeConflictTags = (value: string) => {
    const match =
      value.indexOf('<<<<<<<') > -1 ||
      value.indexOf('=======') > -1 ||
      value.indexOf('>>>>>>>') > -1;
    return !match;
  };

  public render() {
    const { mode } = this.props;
    const language: ICodeLanguageItem = this.getLanguageFromFileName();
    return (
      <Grid
        container={true}
        className={classNames(classes.codeEditorContent, {
          [classes.boxShadow]: this.props.boxShadow,
        })}
      >
        <Grid
          item={true}
          xs={true}
          container={true}
          justifyContent='flex-start'
          alignItems='center'
          className={classes.fileHeader}
        >
          <Grid item={true} xs={true}>
            <span>
              {/* If this.props.loadFile is present,
               * if loadFile contains directories then split and show,
               * else show the 'mode' location from 'foldertext'.
               */}
              {this.props.loadFile ? (
                this.props.loadFile.split('/').map((folder, index) => {
                  {
                    /* If one or last element, return without expand icon */
                  }
                  if (this.props.loadFile.split('/').length === index + 1) {
                    return (
                      <React.Fragment key={index}>
                        <span className={classes.file}>{folder}</span>
                      </React.Fragment>
                    );
                  }
                  {
                    /* Return folder with expand icon */
                  }
                  return (
                    <React.Fragment key={index}>
                      {folder} <i className='fa fa-expand-alt' style={{ fontSize: '2rem' }} />
                    </React.Fragment>
                  );
                })
              ) : (
                <React.Fragment>
                  <i className='fa fa-expand-alt' style={{ fontSize: '2rem' }} />
                </React.Fragment>
              )}

              {/* If not Loadfile, show select*/}
              {!this.props.loadFile ? (
                <React.Fragment>
                  {mode} <i className='fa fa-expand-alt' style={{ fontSize: '2rem' }} />
                  <Select
                    value={this.state.selectedFile}
                    classes={{
                      select: classes.selectFile,
                      icon: classes.hideIcon,
                    }}
                    MenuProps={{
                      classes: {
                        root: classes.selectMenu,
                      },
                    }}
                    onChange={this.switchFile}
                  >
                    {this.state.availableFiles.map((file: string) => {
                      return (
                        <MenuItem value={file} key={file} className={classes.fileMenuItem}>
                          {file}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </React.Fragment>
              ) : null}
            </span>
          </Grid>

          {/* Contains grid items */}
          {this.props.showSaveButton ? this.renderSaveButton() : null}
          {/* Contains grid items */}
          {this.props.closeFileEditor ? this.renderCloseButton() : null}
        </Grid>
        <Grid item={true} xs={12} className={classes.codeEditorContent}>
          <MonacoEditorComponent
            createCompletionSuggestions={this.createCompletionSuggestions}
            heightPx={`${this.props.editorHeight}px`}
            isLoading={this.state.isLoading}
            language={language['name']}
            onValueChange={this.onValueChange}
            value={this.state.value}
            escRef={
              this.props.showSaveButton
                ? this.state.fileEditorSaveRef
                : this.state.fileEditorCancelRef
            }
          />
        </Grid>
        <Grid className={classes.footerContent} item={true} xs={11} />
        <Grid className={classes.footerContent} item={true} xs={1}>
          <span>{language['displayName']}</span>
        </Grid>
      </Grid>
    );
  }
}

export default FileEditor;
