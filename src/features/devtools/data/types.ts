export type IDevToolsState = {
  isOpen: boolean;
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
  logs: IDevToolsLog[];
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
