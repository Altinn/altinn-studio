import React from 'react';

import { AccordionComponentNext } from 'nextsrc/layout/Accordion/AccordionComponent.next';
import { AccordionGroupComponentNext } from 'nextsrc/layout/AccordionGroup/AccordionGroupComponent.next';
import { ActionButtonComponentNext } from 'nextsrc/layout/ActionButton/ActionButtonComponent.next';
import { AddressComponentNext } from 'nextsrc/layout/Address/AddressComponent.next';
import { AddToListComponentNext } from 'nextsrc/layout/AddToList/AddToListComponent.next';
import { AlertComponentNext } from 'nextsrc/layout/Alert/AlertComponent.next';
import { AttachmentListComponentNext } from 'nextsrc/layout/AttachmentList/AttachmentListComponent.next';
import { AudioComponentNext } from 'nextsrc/layout/Audio/AudioComponent.next';
import { ButtonComponentNext } from 'nextsrc/layout/Button/ButtonComponent.next';
import { ButtonGroupComponentNext } from 'nextsrc/layout/ButtonGroup/ButtonGroupComponent.next';
import { CardsComponentNext } from 'nextsrc/layout/Cards/CardsComponent.next';
import { CheckboxesComponentNext } from 'nextsrc/layout/Checkboxes/CheckboxesComponent.next';
import { CustomComponentNext } from 'nextsrc/layout/Custom/CustomComponent.next';
import { CustomButtonComponentNext } from 'nextsrc/layout/CustomButton/CustomButtonComponent.next';
import { DateComponentNext } from 'nextsrc/layout/Date/DateComponent.next';
import { DatepickerComponentNext } from 'nextsrc/layout/Datepicker/DatepickerComponent.next';
import { DividerComponentNext } from 'nextsrc/layout/Divider/DividerComponent.next';
import { DropdownComponentNext } from 'nextsrc/layout/Dropdown/DropdownComponent.next';
import { FileUploadComponentNext } from 'nextsrc/layout/FileUpload/FileUploadComponent.next';
import { FileUploadWithTagComponentNext } from 'nextsrc/layout/FileUploadWithTag/FileUploadWithTagComponent.next';
import { GridComponentNext } from 'nextsrc/layout/Grid/GridComponent.next';
import { GroupComponentNext } from 'nextsrc/layout/Group/GroupComponent.next';
import { HeaderComponentNext } from 'nextsrc/layout/Header/HeaderComponent.next';
import { IFrameComponentNext } from 'nextsrc/layout/IFrame/IFrameComponent.next';
import { ImageComponentNext } from 'nextsrc/layout/Image/ImageComponent.next';
import { ImageUploadComponentNext } from 'nextsrc/layout/ImageUpload/ImageUploadComponent.next';
import { InputComponentNext } from 'nextsrc/layout/Input/InputComponent.next';
import { InstanceInformationComponentNext } from 'nextsrc/layout/InstanceInformation/InstanceInformationComponent.next';
import { InstantiationButtonComponentNext } from 'nextsrc/layout/InstantiationButton/InstantiationButtonComponent.next';
import { LikertComponentNext } from 'nextsrc/layout/Likert/LikertComponent.next';
import { LikertItemComponentNext } from 'nextsrc/layout/LikertItem/LikertItemComponent.next';
import { LinkComponentNext } from 'nextsrc/layout/Link/LinkComponent.next';
import { ListComponentNext } from 'nextsrc/layout/List/ListComponent.next';
import { MapComponentNext } from 'nextsrc/layout/Map/MapComponent.next';
import { MultipleSelectComponentNext } from 'nextsrc/layout/MultipleSelect/MultipleSelectComponent.next';
import { NavigationBarComponentNext } from 'nextsrc/layout/NavigationBar/NavigationBarComponent.next';
import { NavigationButtonsComponentNext } from 'nextsrc/layout/NavigationButtons/NavigationButtonsComponent.next';
import { NumberComponentNext } from 'nextsrc/layout/Number/NumberComponent.next';
import { OptionComponentNext } from 'nextsrc/layout/Option/OptionComponent.next';
import { OrganisationLookupComponentNext } from 'nextsrc/layout/OrganisationLookup/OrganisationLookupComponent.next';
import { PanelComponentNext } from 'nextsrc/layout/Panel/PanelComponent.next';
import { ParagraphComponentNext } from 'nextsrc/layout/Paragraph/ParagraphComponent.next';
import { PaymentComponentNext } from 'nextsrc/layout/Payment/PaymentComponent.next';
import { PaymentDetailsComponentNext } from 'nextsrc/layout/PaymentDetails/PaymentDetailsComponent.next';
import { PDFPreviewButtonComponentNext } from 'nextsrc/layout/PDFPreviewButton/PDFPreviewButtonComponent.next';
import { PersonLookupComponentNext } from 'nextsrc/layout/PersonLookup/PersonLookupComponent.next';
import { PrintButtonComponentNext } from 'nextsrc/layout/PrintButton/PrintButtonComponent.next';
import { RadioButtonsComponentNext } from 'nextsrc/layout/RadioButtons/RadioButtonsComponent.next';
import { RepeatingGroupComponentNext } from 'nextsrc/layout/RepeatingGroup/RepeatingGroupComponent.next';
import { SigneeListComponentNext } from 'nextsrc/layout/SigneeList/SigneeListComponent.next';
import { SigningActionsComponentNext } from 'nextsrc/layout/SigningActions/SigningActionsComponent.next';
import { SigningDocumentListComponentNext } from 'nextsrc/layout/SigningDocumentList/SigningDocumentListComponent.next';
import { SimpleTableComponentNext } from 'nextsrc/layout/SimpleTable/SimpleTableComponent.next';
import { SubformComponentNext } from 'nextsrc/layout/Subform/SubformComponent.next';
import { SummaryComponentNext } from 'nextsrc/layout/Summary/SummaryComponent.next';
import { Summary2ComponentNext } from 'nextsrc/layout/Summary2/Summary2Component.next';
import { TabsComponentNext } from 'nextsrc/layout/Tabs/TabsComponent.next';
import { TextComponentNext } from 'nextsrc/layout/Text/TextComponent.next';
import { TextAreaComponentNext } from 'nextsrc/layout/TextArea/TextAreaComponent.next';
import { TimePickerComponentNext } from 'nextsrc/layout/TimePicker/TimePickerComponent.next';
import { VideoComponentNext } from 'nextsrc/layout/Video/VideoComponent.next';

import type { CompExternal } from 'src/layout/layout';

interface RenderComponentProps {
  component: CompExternal;
}

export const RenderComponent: React.FunctionComponent<RenderComponentProps> = ({ component }) => {
  console.log('dings');

  console.log('component', component.textResourceBindings);

  // const text = component.textResourceBindings
  //   ? textResourceBindings?.resources[component.textResourceBindings]
  //   : component.textResourceBindings;

  if (component.type === 'Accordion') {
    return <AccordionComponentNext {...component} />;
  }

  if (component.type === 'AccordionGroup') {
    return <AccordionGroupComponentNext {...component} />;
  }

  if (component.type === 'ActionButton') {
    return <ActionButtonComponentNext {...component} />;
  }

  if (component.type === 'AddToList') {
    return <AddToListComponentNext {...component} />;
  }

  if (component.type === 'Address') {
    return <AddressComponentNext {...component} />;
  }

  if (component.type === 'Alert') {
    return <AlertComponentNext {...component} />;
  }

  if (component.type === 'AttachmentList') {
    return <AttachmentListComponentNext {...component} />;
  }

  if (component.type === 'Audio') {
    return <AudioComponentNext {...component} />;
  }

  if (component.type === 'Button') {
    return <ButtonComponentNext {...component} />;
  }

  if (component.type === 'ButtonGroup') {
    return <ButtonGroupComponentNext {...component} />;
  }

  if (component.type === 'Cards') {
    return <CardsComponentNext {...component} />;
  }

  if (component.type === 'Checkboxes') {
    return <CheckboxesComponentNext {...component} />;
  }

  if (component.type === 'Custom') {
    return <CustomComponentNext {...component} />;
  }

  if (component.type === 'CustomButton') {
    return <CustomButtonComponentNext {...component} />;
  }

  if (component.type === 'Date') {
    return <DateComponentNext {...component} />;
  }

  if (component.type === 'Datepicker') {
    return <DatepickerComponentNext {...component} />;
  }

  if (component.type === 'Divider') {
    return <DividerComponentNext {...component} />;
  }

  if (component.type === 'Dropdown') {
    return <DropdownComponentNext {...component} />;
  }

  if (component.type === 'FileUpload') {
    return <FileUploadComponentNext {...component} />;
  }

  if (component.type === 'FileUploadWithTag') {
    return <FileUploadWithTagComponentNext {...component} />;
  }

  if (component.type === 'Grid') {
    return <GridComponentNext {...component} />;
  }

  if (component.type === 'Group') {
    return <GroupComponentNext {...component} />;
  }

  if (component.type === 'Header') {
    return <HeaderComponentNext {...component} />;
  }

  if (component.type === 'IFrame') {
    return <IFrameComponentNext {...component} />;
  }

  if (component.type === 'Image') {
    return <ImageComponentNext {...component} />;
  }

  if (component.type === 'ImageUpload') {
    return <ImageUploadComponentNext {...component} />;
  }

  if (component.type === 'Input') {
    return <InputComponentNext {...component} />;
  }

  if (component.type === 'InstanceInformation') {
    return <InstanceInformationComponentNext {...component} />;
  }

  if (component.type === 'InstantiationButton') {
    return <InstantiationButtonComponentNext {...component} />;
  }

  if (component.type === 'Likert') {
    return <LikertComponentNext {...component} />;
  }

  if (component.type === 'LikertItem') {
    return <LikertItemComponentNext {...component} />;
  }

  if (component.type === 'Link') {
    return <LinkComponentNext {...component} />;
  }

  if (component.type === 'List') {
    return <ListComponentNext {...component} />;
  }

  if (component.type === 'Map') {
    return <MapComponentNext {...component} />;
  }

  if (component.type === 'MultipleSelect') {
    return <MultipleSelectComponentNext {...component} />;
  }

  if (component.type === 'NavigationBar') {
    return <NavigationBarComponentNext {...component} />;
  }

  if (component.type === 'NavigationButtons') {
    return <NavigationButtonsComponentNext {...component} />;
  }

  if (component.type === 'Number') {
    return <NumberComponentNext {...component} />;
  }

  if (component.type === 'Option') {
    return <OptionComponentNext {...component} />;
  }

  if (component.type === 'OrganisationLookup') {
    return <OrganisationLookupComponentNext {...component} />;
  }

  if (component.type === 'Paragraph') {
    return <ParagraphComponentNext {...component} />;
  }

  if (component.type === 'PDFPreviewButton') {
    return <PDFPreviewButtonComponentNext {...component} />;
  }

  if (component.type === 'Panel') {
    return <PanelComponentNext {...component} />;
  }

  if (component.type === 'Payment') {
    return <PaymentComponentNext {...component} />;
  }

  if (component.type === 'PaymentDetails') {
    return <PaymentDetailsComponentNext {...component} />;
  }

  if (component.type === 'PersonLookup') {
    return <PersonLookupComponentNext {...component} />;
  }

  if (component.type === 'PrintButton') {
    return <PrintButtonComponentNext {...component} />;
  }

  if (component.type === 'RadioButtons') {
    return <RadioButtonsComponentNext {...component} />;
  }

  if (component.type === 'RepeatingGroup') {
    return <RepeatingGroupComponentNext {...component} />;
  }

  if (component.type === 'SigneeList') {
    return <SigneeListComponentNext {...component} />;
  }

  if (component.type === 'SigningActions') {
    return <SigningActionsComponentNext {...component} />;
  }

  if (component.type === 'SigningDocumentList') {
    return <SigningDocumentListComponentNext {...component} />;
  }

  if (component.type === 'SimpleTable') {
    return <SimpleTableComponentNext {...component} />;
  }

  if (component.type === 'Subform') {
    return <SubformComponentNext {...component} />;
  }

  if (component.type === 'Summary') {
    return <SummaryComponentNext {...component} />;
  }

  if (component.type === 'Summary2') {
    return <Summary2ComponentNext {...component} />;
  }

  if (component.type === 'Tabs') {
    return <TabsComponentNext {...component} />;
  }

  if (component.type === 'Text') {
    return <TextComponentNext {...component} />;
  }

  if (component.type === 'TextArea') {
    return <TextAreaComponentNext {...component} />;
  }

  if (component.type === 'TimePicker') {
    return <TimePickerComponentNext {...component} />;
  }

  if (component.type === 'Video') {
    return <VideoComponentNext {...component} />;
  }

  return <pre>{JSON.stringify(component, null, 2)}</pre>;
};
