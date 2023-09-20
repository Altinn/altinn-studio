import React, { ReactNode } from 'react';
import classes from './LocalChangesActionButton.module.css';
import { Button, Label, Link, Paragraph } from '@digdir/design-system-react';

interface LinkAction {
  /**
   * The href of the link
   */
  href: string;
  /**
   * The usage type
   */
  type: 'link';
}
interface ButtonAction {
  /**
   * Function to be executed on click
   * @returns void
   */
  onClick: () => void;
  /**
   * The usage type
   */
  type: 'button';
}

/**
 * The action type of the component
 */
export type Action = LinkAction | ButtonAction;

export type LocalChangesActionButtonProps = {
  /**
   * The label to display above the button/link
   */
  label: string;
  /**
   * The description to display above the button/link
   */
  description: string;
  /**
   * The color of the button
   */
  color?: 'danger' | 'primary';
  /**
   * Icon to display in the button/link
   */
  icon: ReactNode;
  /**
   * The text on the button/link
   */
  text: string;
  /**
   * The action of the component
   */
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
 *      color='danger'
 *      icon={<TestFlaskIcon />}
 *      text='Text on button'
 *      action={{ type: 'button', onClick: handleClick }}
 *    />
 *
 * @property {string}[label] - The label to display above the button/link
 * @property {string}[description] - The description to display above the button/link
 * @property {'danger' | 'primary'}[color] - The color of the button
 * @property {ReactNode}[icon] - Icon to display in the button/link
 * @property {string}[text] - The text on the button/link
 * @property {Action}[action] - The action of the component
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
