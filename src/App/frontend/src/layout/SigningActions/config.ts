import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';

export const Config = new CG.component({
  category: CompCategory.Action,
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
      title: 'Awaiting signature panel title',
      description: 'The title of the panel that is displayed when the user should sign',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'checkboxLabel',
      title: 'Checkbox label',
      description: 'The text to display when a user is asked to confirm what they are signing',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'checkboxDescription',
      title: 'Checkbox description',
      description: 'A text that describes the checkbox label in more detail if needed',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'signingButton',
      title: 'Signing button',
      description: 'The text to display in the button that the user clicks in order to sign',
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelTitleHasSigned',
      title: 'Go to inbox panel title signed',
      description:
        'The title of the panel that is displayed when the user has signed and no further action is required',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelTitleNotSigned',
      title: 'Go to inbox panel title not signed',
      description:
        'The title of the panel that is displayed when the user has not signed and no further action is required',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelDescriptionHasSigned',
      title: 'Go to inbox panel description signed',
      description:
        'The description of the panel that is displayed when the user has signed and no further action is required',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredPanelDescriptionNotSigned',
      title: 'Go to inbox panel description not signed',
      description:
        'The description of the panel that is displayed when the user has not signed and no further action is required',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'noActionRequiredButton',
      title: 'Go to inbox button',
      description:
        'The text to display in the button that the user clicks in order to go to the inbox and no further action is required',
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'awaitingOtherSignaturesPanelTitle',
      title: 'Not ready for submit title',
      description: 'The title for the panel when the signing task is not ready for submit',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'awaitingOtherSignaturesPanelDescriptionNotSigning',
      title: 'Awaiting other signatures description not signing',
      description: 'The description for the panel when the current user is not signing',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'awaitingOtherSignaturesPanelDescriptionSigned',
      title: 'Signed description',
      description: 'The description for the panel when the current user has signed',
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'submitPanelTitle',
      title: 'Ready for submit title',
      description: 'The title for the panel when the signing task is ready for submit',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'submitPanelDescription',
      title: 'Ready for submit description',
      description: 'The description for the panel when the signing task is ready for submit',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'submitButton',
      title: 'Submit button',
      description: 'The text to display in the button that the user clicks in order to submit the signing task',
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'errorPanelTitle',
      title: 'Error panel title',
      description:
        'The title of the panel that is displayed when at least one of the signees is invalid and thus has not received access to the form',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'errorPanelDescription',
      title: 'Error panel description',
      description:
        'The description of the panel that is displayed when at least one of the signees is invalid and thus has not received access to the form',
    }),
  )

  .addTextResource(
    new CG.trb({
      name: 'rejectModalTitle',
      title: 'Reject modal title',
      description: 'The title of the modal that is displayed when the use clicked on the reject button',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'rejectModalDescription',
      title: 'Reject modal description',
      description: 'The description of the modal that is displayed when the use clicked on the reject button',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'rejectModalButton',
      title: 'Reject modal button',
      description:
        'The text to display in the button that the user clicks in the modal in order to confirm reject of the signing task',
    }),
  )
  .addTextResource(
    new CG.trb({
      name: 'rejectModalTriggerButton',
      title: 'Reject modal trigger button',
      description: 'The text to display in the button that triggers the reject modal',
    }),
  );
