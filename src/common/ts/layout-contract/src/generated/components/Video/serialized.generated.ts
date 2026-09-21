import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';
import { ComponentBase } from '@app/layout-contract/generated/common.generated';

export interface IVideo {
  src: VideoSrc;
}

export interface VideoSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export type CompVideoSerialized = {
  type: 'Video';
  textResourceBindings?: { altText?: ExprValToActualOrExpr<ExprVal.String> };
  video?: IVideo;
  dataModelBindings?: undefined;
} & ComponentBase;

// Source hash: b6f3e4ce66783603853166ae5edb6b7950a7549c0a0d813ac867a7bf1cf2e108
