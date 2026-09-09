import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface AudioSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface IAudio {
  src: AudioSrc;
}

export type CompAudioSerialized = {
  type: 'Audio';
  textResourceBindings?: { altText?: ExprValToActualOrExpr<ExprVal.String> };
  audio?: IAudio;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: 1e8729f3ad7d1b45fb00a2f7b40802b68fd1ccd3131be3970faead37dc1cc709
