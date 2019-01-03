import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';

export interface ICodeEditorProps {
  height?: string;
  width?: string;
  language: string;
}

export interface ICodeEditorState {
  code: string;
 }

export interface ICodeEditorWindow extends Window {
  MonacoEnvironment: any;
}

class CodeEditor extends React.Component<ICodeEditorProps, ICodeEditorState> {
  constructor(props: ICodeEditorProps, state: ICodeEditorState) {
    super(props);
    this.state = {
      code: '// Type some code here...',
    };
  }

  public editorDidMount(editor: any, monaco: any) {
    console.log('editorDidMount', editor);
  }
  
  public render() {
    let {height, width} = this.props;
    height = height ? height : '100%';
    width = width ? width : '100%';
    return (
      <MonacoEditor
        width={width}
        height={height}
        value={this.state.code}
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
          }
        }
        editorDidMount={this.editorDidMount}
      />
    );
  }
}

export default CodeEditor;
