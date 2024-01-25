import type { ComponentType } from './ComponentType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { MapLayer } from 'app-shared/types/MapLayer';
import type { FormPanelVariant } from 'app-shared/types/FormPanelVariant';

type Option<T = any> = {
  label: string;
  value: T;
};

type OptionsComponentBase = {
  options?: Option[];
  preselectedOptionIndex?: number;
  optionsId?: string;
};

type FileUploadComponentBase = {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
};

export type ComponentSpecificConfig<T extends ComponentType = ComponentType> = {
  [ComponentType.Alert]: { severity: 'success' | 'info' | 'warning' | 'danger' };
  [ComponentType.Accordion]: {};
  [ComponentType.AccordionGroup]: {};
  [ComponentType.ActionButton]: {};
  [ComponentType.AddressComponent]: { simplified: boolean };
  [ComponentType.AttachmentList]: {};
  [ComponentType.Button]: { onClickAction: () => void };
  [ComponentType.ButtonGroup]: {};
  [ComponentType.Checkboxes]: OptionsComponentBase;
  [ComponentType.Custom]: { tagName: string; framework: string; [id: string]: any };
  [ComponentType.Datepicker]: { timeStamp: boolean };
  [ComponentType.Dropdown]: { optionsId: string };
  [ComponentType.FileUpload]: FileUploadComponentBase;
  [ComponentType.FileUploadWithTag]: FileUploadComponentBase & { optionsId: string };
  [ComponentType.Grid]: {};
  [ComponentType.Group]: {
    maxCount?: number;
    edit?: {
      multiPage?: boolean;
      mode?: string;
    };
  };
  [ComponentType.Header]: { size: string };
  [ComponentType.IFrame]: {};
  [ComponentType.Image]: {
    image?: {
      src?: KeyValuePairs<string>;
      align?: string | null;
      width?: string;
    };
  };
  [ComponentType.Input]: { disabled?: boolean };
  [ComponentType.InstanceInformation]: {};
  [ComponentType.InstantiationButton]: {};
  [ComponentType.Likert]: {};
  [ComponentType.Link]: {};
  [ComponentType.List]: {};
  [ComponentType.Map]: {
    centerLocation: {
      latitude: number;
      longitude: number;
    };
    zoom: number;
    layers?: MapLayer[];
  };
  [ComponentType.MultipleSelect]: {};
  [ComponentType.NavigationBar]: {};
  [ComponentType.NavigationButtons]: { showSaveButton?: boolean; showPrev?: boolean };
  [ComponentType.Panel]: {
    variant: FormPanelVariant;
    showIcon: boolean;
  };
  [ComponentType.Paragraph]: {};
  [ComponentType.PrintButton]: {};
  [ComponentType.RadioButtons]: OptionsComponentBase;
  [ComponentType.Summary]: {};
  [ComponentType.TextArea]: {};
}[T];
