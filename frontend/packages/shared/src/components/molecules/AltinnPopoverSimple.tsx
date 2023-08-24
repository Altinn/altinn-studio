import React from "react";
import classes from "./AltinnPopoverSimple.module.css";
import type { PopoverOrigin } from "@mui/material";
import { ButtonContainer } from "app-shared/primitives";
import { Popover } from "@mui/material";
import { Button } from "@digdir/design-system-react";

export interface IAltinnPopoverProps {
  anchorEl: any;
  anchorOrigin: PopoverOrigin;
  ariaLabel?: string;
  backgroundColor?: string;
  btnCancelText?: string;
  btnClick?: any;
  btnConfirmText?: string;
  btnPrimaryId?: string;
  btnSecondaryId?: string;
  children: React.ReactNode;
  handleClose: any;
  paperProps?: any;
  testId?: string;
  transformOrigin?: PopoverOrigin;
  open: boolean;
}

const defaultAnchorOrigin: PopoverOrigin = {
  horizontal: "left",
  vertical: "top",
};

const defaultTransformOrigin: PopoverOrigin = {
  horizontal: "left",
  vertical: "top",
};

export const AltinnPopoverSimple = (props: IAltinnPopoverProps) => {
  const {
    anchorOrigin = defaultAnchorOrigin,
    transformOrigin = defaultTransformOrigin,
  } = props;

  const handleButtonClose = (event: React.MouseEvent<HTMLElement>) =>
    props.handleClose("close", event);

  const btnClickedHandler = (event: React.MouseEvent<HTMLElement>) => {
    if (props.btnClick) {
      props.btnClick(event);
    }
  };

  return (
    <Popover
      open={props.open}
      anchorEl={props.anchorEl}
      onClose={props.handleClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      anchorReference={props.anchorEl ? "anchorEl" : "none"}
      PaperProps={{ square: true, ...props.paperProps }}
      aria-label={props.ariaLabel ? props.ariaLabel : ""}
      data-testid={props.testId}
    >
      <div className={classes.container}>
        <div>{props.children}</div>
        <ButtonContainer>
          {props.btnConfirmText && (
            <Button
              id={props.btnPrimaryId}
              color="primary"
              onClick={btnClickedHandler}
              size="small"
            >
              {props.btnConfirmText}
            </Button>
          )}
          {props.btnCancelText && (
            <Button
              id={props.btnSecondaryId}
              color="inverted"
              onClick={handleButtonClose}
              size="small"
            >
              {props.btnCancelText}
            </Button>
          )}
        </ButtonContainer>
      </div>
    </Popover>
  );
};
