import React, { type ReactNode } from 'react';
import {
  DropdownMenu,
  type DropdownMenuProps,
  type DropdownMenuContentProps,
  type DropdownMenuGroupProps,
  type DropdownMenuItemProps,
  DropdownMenuTrigger,
} from '@digdir/design-system-react';

// TODO - Fix the type on this after "TODO ISSUE" is merged
type StudioDropdownMenuTriggerProps = {
  children: ReactNode;
  setOpen: () => void;
};
const StudioDropdownMenuTrigger = ({
  children,
  setOpen,
}: StudioDropdownMenuTriggerProps): React.ReactElement => (
  <DropdownMenuTrigger setOpen={setOpen}>{children}</DropdownMenuTrigger>
);

const StudioDropdownMenuContent = ({ ...rest }: DropdownMenuContentProps): React.ReactElement => {
  return <DropdownMenu.Content {...rest} />;
};

const StudioDropdownMenuGroup = ({ ...rest }: DropdownMenuGroupProps): React.ReactElement => {
  return <DropdownMenu.Group {...rest} />;
};

const StudioDropdownMenuItem = ({ ...rest }: DropdownMenuItemProps): React.ReactElement => {
  return <DropdownMenu.Item {...rest} />;
};

export type StudioDropdownMenuProps = DropdownMenuProps;

const StudioDropdownMenuRoot = ({ ...rest }: StudioDropdownMenuProps): React.ReactElement => {
  return <DropdownMenu {...rest} />;
};

type StudioDropdownMenuComponent = typeof StudioDropdownMenuRoot & {
  Trigger: typeof StudioDropdownMenuTrigger;
  Content: typeof StudioDropdownMenuContent;
  Group: typeof StudioDropdownMenuGroup;
  Item: typeof StudioDropdownMenuItem;
};

const StudioDropdownMenu = StudioDropdownMenuRoot as StudioDropdownMenuComponent;

StudioDropdownMenu.Trigger = StudioDropdownMenuTrigger;
StudioDropdownMenu.Content = StudioDropdownMenuContent;
StudioDropdownMenu.Group = StudioDropdownMenuGroup;
StudioDropdownMenu.Item = StudioDropdownMenuItem;

export {
  StudioDropdownMenu,
  StudioDropdownMenuTrigger,
  StudioDropdownMenuContent,
  StudioDropdownMenuGroup,
  StudioDropdownMenuItem,
};

/*
export interface StudioDropdownMenuProps
  extends Omit<DropdownMenuProps, 'anchorEl' | 'open' | 'onClose'> {
  anchorButtonProps?: StudioButtonProps;
}

export const StudioDropdownMenu = ({
  anchorButtonProps,
  children,
  ...rest
}: StudioDropdownMenuProps) => {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  return (
    <>
      <StudioButton
        aria-expanded={open}
        aria-haspopup='menu'
        ref={anchorRef}
        size={rest.size}
        onClick={() => setOpen(!open)}
        {...anchorButtonProps}
      />
      <DropdownMenu
        portal
        {...rest}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        open={open}
      >
        <DropdownMenu.Content>
          <StudioDropdownMenuContext.Provider value={{ setOpen }}>
            {children}
          </StudioDropdownMenuContext.Provider>
        </DropdownMenu.Content>
      </DropdownMenu>
    </>
  );
};
*/
