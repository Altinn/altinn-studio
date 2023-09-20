import React, { ReactNode } from 'react';
import classes from './LocalChangesActionButton.module.css';
import { Button, Label, Link, Paragraph } from '@digdir/design-system-react';

interface LinkAction {
  href: string;
  type: 'link';
}

interface ButtonAction {
  onClick: () => void;
  type: 'button';
}

type Action = LinkAction | ButtonAction;

export type LocalChangesActionButtonProps = {
  /**
   * The label to display above the button
   */
  label: string;
  /**
   * The description to display above the button
   */
  description: string;
  /**
   * The color of the button
   */
  color?: 'danger' | 'primary';
  /**
   * Function to be executed on click
   * @returns void
   */
  // onClick: () => void;
  /**
   * Icon to display in the button
   */
  icon: ReactNode;
  /**
   * The text on the button
   */
  text: string;
  action: Action;
};

/**
 * @component
 *    Displays a button to be used in the "Local Changes" tab in the Settings Modal,
 *    togeher with a label and description of what the button does.
 *
 * @example
 *    <LocalChangesActionButton
 *      label='Label'
 *      description='Description text'
 *      onClick={handleClick}
 *      color='danger'
 *      icon={<TestFlaskIcon />}
 *      text='Text on button'
 *    />
 *
 * @property {string}[label] - The label to display above the button
 * @property {string}[description] - The description to display above the button
 * @property {'danger' | 'primary'}[color] - The color of the button
 * @property {function}[onClick] - Function to be executed on click
 * @property {ReactNode}[icon] - Icon to display in the button
 * @property {string}[text] - The text on the button
 *
 * @returns {ReactNode} - The rendered component
 */
export const LocalChangesActionButton = ({
  label,
  description,
  color = 'primary',
  icon,
  text,
  action,
}: LocalChangesActionButtonProps): ReactNode => {
  const displayLinkOrButton = () => {
    switch (action.type) {
      case 'link': {
        return (
          <div className={classes.linkAndIconWrapper}>
            <Link href={action.href}>
              {text}
              {icon}
            </Link>
          </div>
        );
      }
      case 'button': {
        return (
          <Button
            variant='outline'
            color={color}
            onClick={action.onClick}
            icon={icon}
            iconPlacement='right'
            size='small'
          >
            {text}
          </Button>
        );
      }
    }
  };

  return (
    <div className={classes.wrapper}>
      <Label as='p' spacing>
        {label}
      </Label>
      <Paragraph className={classes.paragraph} size='small'>
        {description}
      </Paragraph>
      {displayLinkOrButton()}
    </div>
  );
};
