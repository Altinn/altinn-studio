import type { JSX } from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export abstract class ImageDef extends PresentationComponent<'Image'> {
  protected readonly type = 'Image';

  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  abstract renderSummary2(props: Summary2Props): JSX.Element | null;
}

// Source hash: bbce20f9fe992e4bb1888b585405885247a9b4427374c175f6a2339e154ebad4
