export type CodeListTexts = {
  add: string;
  codeList: string;
  delete: string;
  deleteItem: (number: number) => string;
  description: string;
  emptyCodeList: string;
  itemDescription: (number: number) => string;
  itemLabel: (number: number) => string;
  itemValue: (number: number) => string;
  label: string;
  value: string;
};
