import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';

export const Config = new CG.component({
  category: CompCategory.Action,
  availability: 'configurable',
  metadata: {
    name: { nb: 'SigningActions', en: 'SigningActions' },
    lifecycle: { status: 'stable' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  functionality: {
    customExpressions: false,
  },
})
  .addTextResource(
    new CG.trb({
      name: 'awaitingSignaturePanelTitle',
      title: { en: 'Awaiting signature panel title', nb: 'Tittel mens signering avventes' },
      description: {
        en: 'The title of the panel that is displayed when the user should sign',
        nb: 'Tittelen på panelet som vises når brukeren skal signere.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'checkboxLabel',
      title: { en: 'Checkbox label', nb: 'Ledetekst for avkrysningsboks' },
      description: {
        en: 'The text to display when a user is asked to confirm what they are signing',
        nb: 'Teksten som vises når brukeren skal bekrefte hva de signerer.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'checkboxDescription',
      title: { en: 'Checkbox description', nb: 'Beskrivelse av avkrysningsboks' },
      description: {
        en: 'A text that describes the checkbox label in more detail if needed',
        nb: 'En utfyllende beskrivelse av ledeteksten til avkrysningsboksen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'signingButton',
      title: { en: 'Signing button', nb: 'Signeringsknapp' },
      description: {
        en: 'The text to display in the button that the user clicks in order to sign',
        nb: 'Teksten på knappen brukeren velger for å signere.',
      },
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelTitleHasSigned',
      title: { en: 'Go to inbox panel title signed', nb: 'Tittel for innbokspanel etter signering' },
      description: {
        en: 'The title of the panel that is displayed when the user has signed and no further action is required',
        nb: 'Tittelen på panelet som vises når brukeren har signert og ikke trenger å gjøre mer.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelTitleNotSigned',
      title: { en: 'Go to inbox panel title not signed', nb: 'Tittel for innbokspanel uten signering' },
      description: {
        en: 'The title of the panel that is displayed when the user has not signed and no further action is required',
        nb: 'Tittelen på panelet som vises når brukeren ikke har signert og ikke trenger å gjøre mer.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelDescriptionHasSigned',
      title: { en: 'Go to inbox panel description signed', nb: 'Beskrivelse av innbokspanel etter signering' },
      description: {
        en: 'The description of the panel that is displayed when the user has signed and no further action is required',
        nb: 'Beskrivelsen av panelet som vises når brukeren har signert og ikke trenger å gjøre mer.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelDescriptionNotSigned',
      title: { en: 'Go to inbox panel description not signed', nb: 'Beskrivelse av innbokspanel uten signering' },
      description: {
        en: 'The description of the panel that is displayed when the user has not signed and no further action is required',
        nb: 'Beskrivelsen av panelet som vises når brukeren ikke har signert og ikke trenger å gjøre mer.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredButton',
      title: { en: 'Go to inbox button', nb: 'Knapp for å gå til innboksen' },
      description: {
        en: 'The text to display in the button that the user clicks in order to go to the inbox and no further action is required',
        nb: 'Teksten på knappen som går til innboksen når brukeren ikke trenger å gjøre mer.',
      },
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'awaitingOtherSignaturesPanelTitle',
      title: { en: 'Not ready for submit title', nb: 'Tittel når oppgaven ikke kan sendes inn' },
      description: {
        en: 'The title for the panel when the signing task is not ready for submit',
        nb: 'Tittelen på panelet når signeringsoppgaven ikke kan sendes inn.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'awaitingOtherSignaturesPanelDescriptionNotSigning',
      title: {
        en: 'Awaiting other signatures description not signing',
        nb: 'Beskrivelse mens andre signaturer avventes',
      },
      description: {
        en: 'The description for the panel when the current user is not signing',
        nb: 'Beskrivelsen av panelet når den gjeldende brukeren ikke skal signere.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'awaitingOtherSignaturesPanelDescriptionSigned',
      title: { en: 'Signed description', nb: 'Beskrivelse etter signering' },
      description: {
        en: 'The description for the panel when the current user has signed',
        nb: 'Beskrivelsen av panelet når den gjeldende brukeren har signert.',
      },
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'submitPanelTitle',
      title: { en: 'Ready for submit title', nb: 'Tittel når oppgaven kan sendes inn' },
      description: {
        en: 'The title for the panel when the signing task is ready for submit',
        nb: 'Tittelen på panelet når signeringsoppgaven kan sendes inn.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'submitPanelDescription',
      title: { en: 'Ready for submit description', nb: 'Beskrivelse når oppgaven kan sendes inn' },
      description: {
        en: 'The description for the panel when the signing task is ready for submit',
        nb: 'Beskrivelsen av panelet når signeringsoppgaven kan sendes inn.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'submitButton',
      title: { en: 'Submit button', nb: 'Send inn-knapp' },
      description: {
        en: 'The text to display in the button that the user clicks in order to submit the signing task',
        nb: 'Teksten på knappen som sender inn signeringsoppgaven.',
      },
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'errorPanelTitle',
      title: { en: 'Error panel title', nb: 'Tittel i feilpanel' },
      description: {
        en: 'The title of the panel that is displayed when at least one of the signees is invalid and thus has not received access to the form',
        nb: 'Tittelen på panelet som vises når minst én signatar er ugyldig og ikke har fått tilgang til skjemaet.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'errorPanelDescription',
      title: { en: 'Error panel description', nb: 'Beskrivelse i feilpanel' },
      description: {
        en: 'The description of the panel that is displayed when at least one of the signees is invalid and thus has not received access to the form',
        nb: 'Beskrivelsen av panelet som vises når minst én signatar er ugyldig og ikke har fått tilgang til skjemaet.',
      },
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'rejectModalTitle',
      title: { en: 'Reject modal title', nb: 'Tittel i avvisningsdialog' },
      description: {
        en: 'The title of the modal that is displayed when the use clicked on the reject button',
        nb: 'Tittelen på dialogen som vises når brukeren velger avvisningsknappen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'rejectModalDescription',
      title: { en: 'Reject modal description', nb: 'Beskrivelse i avvisningsdialog' },
      description: {
        en: 'The description of the modal that is displayed when the use clicked on the reject button',
        nb: 'Beskrivelsen av dialogen som vises når brukeren velger avvisningsknappen.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'rejectModalButton',
      title: { en: 'Reject modal button', nb: 'Avvisningsknapp i dialog' },
      description: {
        en: 'The text to display in the button that the user clicks in the modal in order to confirm reject of the signing task',
        nb: 'Teksten på knappen som bekrefter avvisning av signeringsoppgaven.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'rejectModalCloseButton',
      title: { en: 'Reject modal close button', nb: 'Lukkeknapp i avvisningsdialog' },
      description: {
        en: 'The text to display in the button that closes the modal without rejecting the signing task, i.e. continuing the signing',
        nb: 'Teksten på knappen som lukker dialogen uten å avvise signeringsoppgaven.',
      },
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'rejectModalTriggerButton',
      title: { en: 'Reject modal trigger button', nb: 'Knapp som åpner avvisningsdialogen' },
      description: {
        en: 'The text to display in the button that triggers the reject modal',
        nb: 'Teksten på knappen som åpner avvisningsdialogen.',
      },
    }),
  );
