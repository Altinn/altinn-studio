import { StudioButton } from '@designer/components';
import { CogIcon } from '@designer/icons';

export interface IRuleButtonProps {
  onClick: () => void;
  text: string;
}

export default function RuleButton(props: IRuleButtonProps) {
  return (
    <StudioButton icon={<CogIcon />} onClick={props.onClick} variant='secondary'>
      {props.text}
    </StudioButton>
  );
}
