export type SubformPdfComponentPayload =
  | {
      componentId: string;
      sourceLayoutSetId: string;
      previousComponentId?: string;
    }
  | {
      componentId: null;
      previousComponentId: string;
    };
