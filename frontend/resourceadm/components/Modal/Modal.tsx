import React, { ReactNode } from "react";
import classes from "./Modal.module.css";
import ReactModal from "react-modal";
import { Heading } from "@digdir/design-system-react";

/**
 * Style the modal
 */
const modalStyles = {
  content: {
    width: "600px",
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
   * Boolean for if the modal is open
   */
  isOpen: boolean;
  /**
   * Title to be displayed in the modal
   */
  title: string;
  /**
   * Function to handle close of the modal
   * @returns void
   */
  onClose?: () => void;
  /**
   * React components inside the Modal
   */
  children: ReactNode;
}

/**
 * @component
 *    Modal component implementing the react-modal.
 *
 * @example
 *    <Modal isOpen={isOpen} onClose={handleClose} title='Some title'>
 *      <div>...</div>
 *    </Modal>
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {string}[title] - Title to be displayed in the modal
 * @property {function}[onClose] - Function to handle close of the modal
 * @property {ReactNode}[children] - React components inside the Modal
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const Modal = ({
  isOpen,
  title,
  onClose,
  children,
}: Props): React.ReactNode => {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={() => onClose && onClose()}
      contentLabel={title}
      style={modalStyles}
      ariaHideApp={false}
    >
      <Heading size="xsmall" spacing level={2}>
        {title}
      </Heading>
      <div className={classes.contentDivider} />
      {children}
    </ReactModal>
  );
};
