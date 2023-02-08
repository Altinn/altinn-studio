import React, { Fragment } from 'react';
import classNames from 'classnames';
import { diffChars } from 'diff';
import MonacoEditorComponent from './MonacoEditorComponent';
import { get, post } from '../utils/networking';
import postMessages from '../utils/postMessages';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';
import { getServiceFilesPath, ruleHandlerPath, saveRuleHandlerPath } from '../api-paths';
import classes from './FileEditor.module.css';
import { Button, ButtonVariant, Select } from '@digdir/design-system-react';
import { Cancel, Next, Success } from '@navikt/ds-icons';

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
    get(ruleHandlerPath(org, app)).then((logicFileContent) => {
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

  public saveFile = async () => {
    let stageFile = false;
    if (
      this.props.stageAfterSaveFile === true &&
      this.valueHasNoMergeConflictTags(this.state.value)
    ) {
      stageFile = true;
    }
    const { org, app } = _useParamsClassCompHack();
    const saveRes: any = await post(
      saveRuleHandlerPath(org, app, stageFile),
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

  public renderCloseButton = (): JSX.Element =>  (
    <>
      <Button
        icon={<Cancel/>}
        onClick={this.props.closeFileEditor}
        variant={ButtonVariant.Quiet}
        title='Lukk'
      />
      <Button
        icon={<Success/>}
        onClick={this.saveFile}
        variant={ButtonVariant.Quiet}
        title='Lagre'
      />
    </>
  );

  public renderSaveButton = (): JSX.Element => (
    <div ref={this.state.fileEditorSaveRef}>
      <Button
        disabled={!this.state.valueDiff}
        icon={<Success/>}
        onClick={this.saveFile}
        title='Lagre fil'
      />
    </div>
  );

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
      <div
        className={classNames(classes.root, {
          [classes.boxShadow]: this.props.boxShadow,
        })}
      >
        <div className={classes.header}>
          {/* If this.props.loadFile is present,
           * if loadFile contains directories then split and show,
           * else show the 'mode' location from 'foldertext'.
           */}
          {this.props.loadFile ? (
            this.props.loadFile.split('/').map((folder, index) => {
              /* If one or last element, return without expand icon */
              if (this.props.loadFile.split('/').length === index + 1) {
                return (
                  <Fragment key={index}>
                    <span className={classes.file}>{folder}</span>
                  </Fragment>
                );
              }
              /* Return folder with expand icon */
              return (
                <Fragment key={index}>
                  {folder} <Next/>
                </Fragment>
              );
            })
          ) : <Next/>}

          {/* If not Loadfile, show select*/}
          {!this.props.loadFile ? (
            <>
              {mode} <Next/>
              <div className={classes.select}>
                <Select
                  value={this.state.selectedFile}
                  onChange={this.loadFileContent}
                  options={this.state.availableFiles.map((file) => ({ label: file, value: file }))}
                />
              </div>
            </>
          ) : null}

          {this.props.showSaveButton && this.renderSaveButton()}
          {this.props.closeFileEditor && this.renderCloseButton()}
        </div>
        <div className={classes.codeEditorContent}>
          <MonacoEditorComponent
            createCompletionSuggestions={this.createCompletionSuggestions}
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
        </div>
        <div className={classes.footer}>
          {language['displayName']}
        </div>
      </div>
    );
  }
}

export default FileEditor;
