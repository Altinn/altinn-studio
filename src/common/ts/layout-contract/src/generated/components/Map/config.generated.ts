import {
  ComponentBase,
  FormComponentPropsWithRequired,
  IDataModelReference,
  ISummaryOverridesCommon,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { CompCategory, ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface CompMapExternal
  extends
    ComponentBase,
    FormComponentPropsWithRequired,
    SummarizableComponentProps,
    LabeledComponentProps {
  type: 'Map';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForMap;
  layers?: MapLayer[];
  centerLocation?: Location;
  zoom?: number;
  geometryType?: IGeometryType;
  toolbar?: Toolbar;
}

export interface IDataModelBindingsForMap {
  simpleBinding?: IDataModelReference;
  geometries?: IDataModelReference;
  geometryLabel?: IDataModelReference;
  geometryData?: IDataModelReference;
  geometryIsEditable?: IDataModelReference;
  geometryIsHidden?: IDataModelReference;
  geometryStyle?: IDataModelReference;
}

export type IGeometryType = 'GeoJSON' | 'WKT';

export interface Location {
  latitude: ExprValToActualOrExpr<ExprVal.Number>;
  longitude: ExprValToActualOrExpr<ExprVal.Number>;
}

export type MapLayer = MapTileLayer | MapWMSLayer;

export type MapSummaryOverridesWithRef =
  | ({ componentId: string } & ISummaryOverridesCommon)
  | ({ componentType: 'Map' } & ISummaryOverridesCommon);

export interface MapTileLayer {
  url: string;
  attribution?: string;
  subdomains?: string[];
  type?: 'TileLayer';
  minZoom?: number;
  maxZoom?: number;
}

export interface MapWMSLayer {
  url: string;
  attribution?: string;
  subdomains?: string[];
  type: 'WMS';
  layers: string;
  format?: string;
  version?: string;
  transparent?: boolean;
  uppercase?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export interface Toolbar {
  polyline?: ExprValToActualOrExpr<ExprVal.Boolean>;
  polygon?: ExprValToActualOrExpr<ExprVal.Boolean>;
  rectangle?: ExprValToActualOrExpr<ExprVal.Boolean>;
  circle?: ExprValToActualOrExpr<ExprVal.Boolean>;
  marker?: ExprValToActualOrExpr<ExprVal.Boolean>;
}

export const componentConfig = {
  category: CompCategory.Form,
  availability: 'configurable',
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
  behaviors: {
    isSummarizable: true,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  },
} as const;

export type TypeConfig = {
  category: typeof componentConfig.category;
  availability: typeof componentConfig.availability;
  layout: CompMapExternal;
  summaryOverrides: ISummaryOverridesCommon;
  summaryOverridesWithRef: MapSummaryOverridesWithRef;
};

// Source hash: 854f2f6e017a22cb4c120a8c76d85674c1a33274ffe298b72135bb891aa090de
