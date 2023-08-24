import React from "react";
import classes from "./VerificationModal.module.css";
import Modal from "react-modal";
import { Button, Heading, Paragraph } from "@digdir/design-system-react";

const modalStyles = {
  content: {
    width: "450px",
    height: "fit-content",
    margin: "auto",
    padding: "32px",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
};

interface Props {
  /**
   * Boolean for if the modal is open or not
   */
  isOpen: boolean;
  /**
   * Function to be executed when closing the modal
   * @returns void
   */
  onClose: () => void;
  /**
   * The text to display in the modal
   */
  text: string;
  /**
   * The text to display on the close button
   */
  closeButtonText: string;
  /**
   * The text to display on the action button
   */
  actionButtonText: string;
  /**
   * Function to be executed when the action button is clicked
   * @returns void
   */
  onPerformAction: () => void;
}

/**
 * @component
 *    Displays a verification modal. To be used when the user needs one extra level
 *    of chekcing if they really want to perform an action.
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open or not
 * @property {function}[onClose] - Function to be executed when closing the modal
 * @property {string}[text] -The text to display in the modal
 * @property {string}[closeButtonText] - The text to display on the close button
 * @property {string}[actionButtonText] - The text to display on the action button
 * @property {function}[onPerformAction] - Function to be executed when the action button is clicked
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const VerificationModal = ({
  isOpen,
  onClose,
  text,
  closeButtonText,
  actionButtonText,
  onPerformAction,
}: Props): React.ReactNode => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Verification Modal"
      style={modalStyles}
      ariaHideApp={false}
    >
      <Heading size="xsmall" spacing level={2}>
        Slett regel?
      </Heading>
      <div className={classes.contentDivider} />
      <Paragraph size="small">{text}</Paragraph>
      <div className={classes.buttonWrapper}>
        <div className={classes.closeButtonWrapper}>
          <Button onClick={onClose} variant="quiet">
            {closeButtonText}
          </Button>
        </div>
        <Button onClick={onPerformAction} color="primary">
          {actionButtonText}
        </Button>
      </div>
    </Modal>
  );
};
