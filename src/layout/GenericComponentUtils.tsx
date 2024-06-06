import React from 'react';

import { Description } from 'src/components/form/Description';
import { Label } from 'src/components/form/Label';
import { Legend } from 'src/components/form/Legend';
import { Lang } from 'src/features/language/Lang';
import { useFormComponentCtxStrict } from 'src/layout/FormComponentContext';
import type { ITextResourceBindings } from 'src/layout/layout';

export function GenericComponentLabel() {
  const { overrideDisplay, id, node } = useFormComponentCtxStrict();
  if (overrideDisplay?.renderLabel === false) {
    return null;
  }

  const trb = (node.item.textResourceBindings || {}) as Exclude<ITextResourceBindings, undefined>;
  const titleTrb = 'title' in trb ? trb.title : undefined;
  const helpTrb = 'help' in trb ? trb.help : undefined;

  return (
    <Label
      key={`label-${id}`}
      label={<Lang id={titleTrb} />}
      helpText={helpTrb && <Lang id={helpTrb} />}
      id={id}
      readOnly={'readOnly' in node.item ? node.item.readOnly : false}
      required={'required' in node.item ? node.item.required : false}
      labelSettings={'labelSettings' in node.item ? node.item.labelSettings : undefined}
    />
  );
}

export function GenericComponentDescription() {
  const { id, node } = useFormComponentCtxStrict();
  const trb = (node.item.textResourceBindings || {}) as Exclude<ITextResourceBindings, undefined>;
  const descriptionTrb = 'description' in trb ? trb.description : undefined;

  if (!descriptionTrb) {
    return null;
  }

  return (
    <Description
      key={`description-${id}`}
      description={<Lang id={descriptionTrb} />}
      id={id}
    />
  );
}

export function GenericComponentLegend() {
  const { overrideDisplay, id, node } = useFormComponentCtxStrict();
  if (overrideDisplay?.renderLegend === false) {
    return null;
  }

  const trb = (node.item.textResourceBindings || {}) as Exclude<ITextResourceBindings, undefined>;
  const titleTrb = 'title' in trb ? trb.title : undefined;
  const helpTrb = 'help' in trb ? trb.help : undefined;
  const descriptionTrb = 'description' in trb ? trb.description : undefined;

  return (
    <Legend
      key={`legend-${id}`}
      label={<Lang id={titleTrb} />}
      description={descriptionTrb && <Lang id={descriptionTrb} />}
      helpText={helpTrb && <Lang id={helpTrb} />}
      id={id}
      required={'required' in node.item ? node.item.required : false}
      labelSettings={'labelSettings' in node.item ? node.item.labelSettings : undefined}
      layout={('layout' in node.item && node.item.layout) || undefined}
      readOnly={'readOnly' in node.item ? node.item.readOnly : false}
    />
  );
}
