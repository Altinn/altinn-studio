import type { ComponentTypeV3 } from './ComponentTypeV3';
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

export type ComponentSpecificConfigV3<T extends ComponentTypeV3 = ComponentTypeV3> = {
  [ComponentTypeV3.Alert]: { severity: 'success' | 'info' | 'warning' | 'danger' };
  [ComponentTypeV3.Accordion]: {};
  [ComponentTypeV3.AccordionGroup]: {};
  [ComponentTypeV3.ActionButton]: {};
  [ComponentTypeV3.AddressComponent]: { simplified: boolean };
  [ComponentTypeV3.AttachmentList]: {};
  [ComponentTypeV3.Button]: { onClickAction: () => void };
  [ComponentTypeV3.ButtonGroup]: {};
  [ComponentTypeV3.Checkboxes]: OptionsComponentBase;
  [ComponentTypeV3.Custom]: { tagName: string; framework: string; [id: string]: any };
  [ComponentTypeV3.Datepicker]: { timeStamp: boolean };
  [ComponentTypeV3.Dropdown]: { optionsId: string };
  [ComponentTypeV3.FileUpload]: FileUploadComponentBase;
  [ComponentTypeV3.FileUploadWithTag]: FileUploadComponentBase & { optionsId: string };
  [ComponentTypeV3.Grid]: {};
  [ComponentTypeV3.Group]: {
    maxCount?: number;
    edit?: {
      multiPage?: boolean;
      mode?: string;
    };
  };
  [ComponentTypeV3.Header]: { size: string };
  [ComponentTypeV3.IFrame]: {};
  [ComponentTypeV3.Image]: {
    image?: {
      src?: KeyValuePairs<string>;
      align?: string | null;
      width?: string;
    };
  };
  [ComponentTypeV3.Input]: { disabled?: boolean };
  [ComponentTypeV3.InstanceInformation]: {};
  [ComponentTypeV3.InstantiationButton]: {};
  [ComponentTypeV3.Likert]: {};
  [ComponentTypeV3.Link]: {};
  [ComponentTypeV3.List]: {};
  [ComponentTypeV3.Map]: {
    centerLocation: {
      latitude: number;
      longitude: number;
    };
    zoom: number;
    layers?: MapLayer[];
  };
  [ComponentTypeV3.MultipleSelect]: {};
  [ComponentTypeV3.NavigationBar]: {};
  [ComponentTypeV3.NavigationButtons]: { showSaveButton?: boolean; showPrev?: boolean };
  [ComponentTypeV3.Panel]: {
    variant: FormPanelVariant;
    showIcon: boolean;
  };
  [ComponentTypeV3.Paragraph]: {};
  [ComponentTypeV3.PrintButton]: {};
  [ComponentTypeV3.RadioButtons]: OptionsComponentBase;
  [ComponentTypeV3.Summary]: {};
  [ComponentTypeV3.TextArea]: {};
}[T];
