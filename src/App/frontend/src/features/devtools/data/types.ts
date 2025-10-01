export type DevToolsHiddenComponents = 'show' | 'disabled' | 'hide';

export type IDevToolsState = {
  isOpen: boolean;
  pdfPreview: boolean;
  hiddenComponents: DevToolsHiddenComponents;
  activeTab: DevToolsTab;
  layoutInspector: {
    selectedComponentId: string | undefined;
  };
  nodeInspector: {
    selectedNodeId: string | undefined;
  };
  exprPlayground: {
    expression: string | undefined;
    nodeId: string | undefined;
    baseId: string | undefined;
  };
  logs: IDevToolsLog[];
};

export type IDevToolsActions = {
  open: () => void;
  close: () => void;
  setActiveTab: (tabName: DevToolsTab) => void;
  focusLayoutInspector: (componentId: string) => void;
  focusNodeInspector: (nodeId: string) => void;
  setPdfPreview: (preview: boolean) => void;
  setShowHiddenComponents: (value: DevToolsHiddenComponents) => void;
  exprPlaygroundSetExpression: (expression: string | undefined) => void;
  exprPlaygroundSetContext: (nodeId: string | undefined, baseId: string | undefined) => void;
  layoutInspectorSet: (selectedComponentId: string | undefined) => void;
  nodeInspectorSet: (selectedNodeId: string | undefined) => void;
  postLogs: (logs: IDevToolsLog[]) => void;
  logsClear: () => void;
};

export type IDevToolsLog = {
  index: number;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export enum DevToolsTab {
  General = 'Generelt',
  Layout = 'Layout',
  Components = 'Komponenter',
  Expressions = 'Uttrykk',
  FeatureToggles = 'Beta-funksjonalitet',
  Logs = 'Logger',
}
