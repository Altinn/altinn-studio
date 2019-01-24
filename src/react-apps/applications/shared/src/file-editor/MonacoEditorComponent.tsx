import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';

export interface IMonacoEditorComponentProps {
  height?: string;
  width?: string;
  language: string;
  value: string;
  onValueChange: (value: string) => void;
}

export interface IMonacoEditorComponentState {
  code: string;
 }

export interface IMonacoEditorComponentWindow extends Window {
  MonacoEnvironment: any;
}

class MonacoEditorComponent extends React.Component<IMonacoEditorComponentProps, IMonacoEditorComponentState> {
  constructor(props: IMonacoEditorComponentProps, state: IMonacoEditorComponentState) {
    super(props);
    this.state = {
      code: props.value,
    };
  }
  
  public render() {
    let {height, width} = this.props;
    height = height ? height : '100%';
    width = width ? width : '100%';
    return (
      <MonacoEditor
        width={width}
        height={height}
        value={this.props.value}
        language={this.props.language}
        options={
          {
            autoClosingBrackets: 'always',
            autoIndent: true,
            automaticLayout: true,
            colorDecorators: true,
            minimap: {
              enabled: false,
            },
            cursorBlinking: 'smooth',
            scrollbar: {
              vertical: 'auto',
            },
            scrollBeyondLastLine: false,
          }
        }
        onChange={this.props.onValueChange}
      />
    );
  }
}

export default MonacoEditorComponent;
