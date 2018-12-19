import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';

export interface ICodeEditorProps { 
  height?: string;
  width?: string;
}

export interface ICodeEditorState {
  code: string;
 }

class CodeEditor extends React.Component<ICodeEditorProps, ICodeEditorState> {
  constructor(props: ICodeEditorProps, state: ICodeEditorState) {
    super(props);
    this.state = {
      code: '// Type some code here...',
    };
  }
  public render() {
    let {height, width} = this.props;
    height = height ? height : '100%';
    width = width ? width : 'calc(100% - 80px)';
    return (
      <MonacoEditor
        width={width}
        height={height}
        value={this.state.code}
      />
    );
  }
}

export default CodeEditor;
