export type IDevToolsState = {
  isOpen: boolean;
  hasBeenOpen: boolean;
  pdfPreview: boolean;
  hiddenComponents: 'show' | 'disabled' | 'hide';
  activeTab: DevToolsTab;
  layoutInspector: {
    selectedComponentId: string | undefined;
  };
  nodeInspector: {
    selectedNodeId: string | undefined;
  };
  exprPlayground: {
    expression: string | undefined;
    forPage: string | undefined;
    forComponentId: string | undefined;
  };
};

export enum DevToolsTab {
  General = 'Generelt',
  Layout = 'Layout',
  Components = 'Komponenter',
  Expressions = 'Uttrykk',
}
