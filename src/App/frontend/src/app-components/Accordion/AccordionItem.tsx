import React from 'react';

import { Details } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/app-components/Accordion/AccordionItem.module.css';
import { useTranslation } from 'src/app-components/AppComponentsProvider';
import type { TranslationKey } from 'src/app-components/types';

interface AccordionProps {
  title: TranslationKey;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export const AccordionItem = ({
  title,
  children,
  className,
  open,
  defaultOpen = false,
  onToggle,
}: AccordionProps): React.JSX.Element => {
  const [isOpen, setOpen] = React.useState(defaultOpen);
  const { TranslateComponent } = useTranslation();

  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : isOpen;

  const handleToggle = () => {
    const newOpen = !currentOpen;
    if (!isControlled) {
      setOpen(newOpen);
    }
    onToggle?.(newOpen);
  };

  return (
    <Details
      open={currentOpen}
      onToggle={handleToggle}
      className={cn(className, classes.accordion)}
    >
      <Details.Summary>
        <TranslateComponent tKey={title} />
      </Details.Summary>
      <Details.Content>{children}</Details.Content>
    </Details>
  );
};
