import AlertSchema from './schemas/json/component/Alert.schema.v1.json';
import AccordionSchema from './schemas/json/component/Accordion.schema.v1.json';
import AccordionGroupSchema from './schemas/json/component/AccordionGroup.schema.v1.json';
import ActionButtonSchema from './schemas/json/component/ActionButton.schema.v1.json';
import AddressSchema from './schemas/json/component/Address.schema.v1.json';
import AttachmentListSchema from './schemas/json/component/AttachmentList.schema.v1.json';
import ButtonSchema from './schemas/json/component/Button.schema.v1.json';
import ButtonGroupSchema from './schemas/json/component/ButtonGroup.schema.v1.json';
import CheckboxesSchema from './schemas/json/component/Checkboxes.schema.v1.json';
import CustomSchema from './schemas/json/component/Custom.schema.v1.json';
import CustomButtonSchema from './schemas/json/component/CustomButton.schema.v1.json';
import DatepickerSchema from './schemas/json/component/Datepicker.schema.v1.json';
import Divider from './schemas/json/component/Divider.schema.v1.json';
import DropdownSchema from './schemas/json/component/Dropdown.schema.v1.json';
import FileUploadSchema from './schemas/json/component/FileUpload.schema.v1.json';
import FileUploadWithTagSchema from './schemas/json/component/FileUploadWithTag.schema.v1.json';
import GridSchema from './schemas/json/component/Grid.schema.v1.json';
import GroupSchema from './schemas/json/component/Group.schema.v1.json';
import HeaderSchema from './schemas/json/component/Header.schema.v1.json';
import IFrameSchema from './schemas/json/component/IFrame.schema.v1.json';
import ImageSchema from './schemas/json/component/Image.schema.v1.json';
import InputSchema from './schemas/json/component/Input.schema.v1.json';
import InstanceInformationSchema from './schemas/json/component/InstanceInformation.schema.v1.json';
import InstantiationButtonSchema from './schemas/json/component/InstantiationButton.schema.v1.json';
import LikertSchema from './schemas/json/component/Likert.schema.v1.json';
import LinkSchema from './schemas/json/component/Link.schema.v1.json';
import ListSchema from './schemas/json/component/List.schema.v1.json';
import MapSchema from './schemas/json/component/Map.schema.v1.json';
import MultipleSelectSchema from './schemas/json/component/MultipleSelect.schema.v1.json';
import NavigationBarSchema from './schemas/json/component/NavigationBar.schema.v1.json';
import NavigationButtonsSchema from './schemas/json/component/NavigationButtons.schema.v1.json';
import OrganisationLookupSchema from './schemas/json/component/OrganisationLookup.schema.v1.json';
import PanelSchema from './schemas/json/component/Panel.schema.v1.json';
import ParagraphSchema from './schemas/json/component/Paragraph.schema.v1.json';
import PaymentDetailsSchema from './schemas/json/component/PaymentDetails.schema.v1.json';
import PaymentSchema from './schemas/json/component/Payment.schema.v1.json';
import PersonLookupSchema from './schemas/json/component/PersonLookup.schema.v1.json';
import PrintButtonSchema from './schemas/json/component/PrintButton.schema.v1.json';
import RadioButtonsSchema from './schemas/json/component/RadioButtons.schema.v1.json';
import RepeatingGroupSchema from './schemas/json/component/RepeatingGroup.schema.v1.json';
import SubformSchema from './schemas/json/component/Subform.schema.v1.json';
import SummarySchema from './schemas/json/component/Summary.schema.v1.json';
import Summary2Schema from './schemas/json/component/Summary2.schema.v1.json';
import TextAreaSchema from './schemas/json/component/TextArea.schema.v1.json';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { JsonSchema } from 'app-shared/types/JsonSchema';

export const componentSchemaMocks: Record<ComponentType, JsonSchema> = {
  [ComponentType.AccordionGroup]: AccordionGroupSchema,
  [ComponentType.Accordion]: AccordionSchema,
  [ComponentType.ActionButton]: ActionButtonSchema,
  [ComponentType.Address]: AddressSchema,
  [ComponentType.Alert]: AlertSchema,
  [ComponentType.AttachmentList]: AttachmentListSchema,
  [ComponentType.Button]: ButtonSchema,
  [ComponentType.ButtonGroup]: ButtonGroupSchema,
  [ComponentType.Checkboxes]: CheckboxesSchema,
  [ComponentType.Custom]: CustomSchema,
  [ComponentType.CustomButton]: CustomButtonSchema,
  [ComponentType.Datepicker]: DatepickerSchema,
  [ComponentType.Dropdown]: DropdownSchema,
  [ComponentType.FileUpload]: FileUploadSchema,
  [ComponentType.FileUploadWithTag]: FileUploadWithTagSchema,
  [ComponentType.Grid]: GridSchema,
  [ComponentType.Group]: GroupSchema,
  [ComponentType.Header]: HeaderSchema,
  [ComponentType.IFrame]: IFrameSchema,
  [ComponentType.Image]: ImageSchema,
  [ComponentType.Input]: InputSchema,
  [ComponentType.InstanceInformation]: InstanceInformationSchema,
  [ComponentType.InstantiationButton]: InstantiationButtonSchema,
  [ComponentType.Likert]: LikertSchema,
  [ComponentType.Link]: LinkSchema,
  [ComponentType.List]: ListSchema,
  [ComponentType.Map]: MapSchema,
  [ComponentType.MultipleSelect]: MultipleSelectSchema,
  [ComponentType.NavigationBar]: NavigationBarSchema,
  [ComponentType.NavigationButtons]: NavigationButtonsSchema,
  [ComponentType.OrganisationLookup]: OrganisationLookupSchema,
  [ComponentType.Panel]: PanelSchema,
  [ComponentType.Paragraph]: ParagraphSchema,
  [ComponentType.Payment]: PaymentSchema,
  [ComponentType.PaymentDetails]: PaymentDetailsSchema,
  [ComponentType.PersonLookup]: PersonLookupSchema,
  [ComponentType.PrintButton]: PrintButtonSchema,
  [ComponentType.RadioButtons]: RadioButtonsSchema,
  [ComponentType.RepeatingGroup]: RepeatingGroupSchema,
  [ComponentType.Subform]: SubformSchema,
  [ComponentType.Summary]: SummarySchema,
  [ComponentType.Summary2]: Summary2Schema,
  [ComponentType.TextArea]: TextAreaSchema,
  [ComponentType.Divider]: Divider,
};
