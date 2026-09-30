export type DisplayAttachment = {
  name?: string;
  baseName: string;
  fileEnding: string;
  iconClass: string;
  grouping: string | undefined;
  description: Partial<Record<string, string>> | undefined;
  url?: string;
  dataType: string;
  tags?: string[];
};
