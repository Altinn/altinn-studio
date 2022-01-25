import { IComponentProps } from "src/components";

export interface IFileUploadGenericProps extends IComponentProps {
  hasCustomFileEndings?: boolean;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
}
