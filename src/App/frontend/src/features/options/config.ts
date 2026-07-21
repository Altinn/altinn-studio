import { CG } from 'src/codegen/CG';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';

interface OptionsComponentConfig {
  supportsPreselection: boolean;
}

export function asOptionsComponent(
  config: ComponentConfig,
  { supportsPreselection }: OptionsComponentConfig,
): ComponentConfig {
  config.inner.extends(supportsPreselection ? CG.common('ISelectionComponentFull') : CG.common('ISelectionComponent'));
  config.behaviors.canHaveOptions = true;
  return config;
}
