type ExternalResourceType = 'code_list' | 'image' | 'text';

export type ExternalResource = {
  source: string;
  type: ExternalResourceType;
  id: string;
};
