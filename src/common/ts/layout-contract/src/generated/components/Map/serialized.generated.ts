import {
  ComponentBase,
  FormComponentProps,
  IRawDataModelBinding,
  LabeledComponentProps,
  SummarizableComponentProps,
  TRBFormComp,
  TRBLabel,
  TRBSummarizable,
} from '@app/layout-contract/generated/common.generated';
import { ExprVal, ExprValToActualOrExpr } from '@app/layout-contract';

export interface IDataModelBindingsForMap {
  simpleBinding?: IRawDataModelBinding;
  geometries?: IRawDataModelBinding;
  geometryLabel?: IRawDataModelBinding;
  geometryData?: IRawDataModelBinding;
  geometryIsEditable?: IRawDataModelBinding;
  geometryIsHidden?: IRawDataModelBinding;
  geometryStyle?: IRawDataModelBinding;
}

export type IGeometryType = 'GeoJSON' | 'WKT';

export interface Location {
  latitude: ExprValToActualOrExpr<ExprVal.Number>;
  longitude: ExprValToActualOrExpr<ExprVal.Number>;
}

export type MapLayer = MapTileLayer | MapWMSLayer;

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

export type CompMapSerialized = {
  type: 'Map';
  textResourceBindings?: TRBFormComp & TRBSummarizable & TRBLabel;
  removeWhenHidden?: ExprValToActualOrExpr<ExprVal.Boolean>;
  dataModelBindings: IDataModelBindingsForMap;
  layers?: MapLayer[];
  centerLocation?: Location;
  zoom?: number;
  geometryType?: IGeometryType;
  toolbar?: Toolbar;
} & ComponentBase &
  FormComponentProps &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: d8df2bb2a0ae9c3ff809ddf846ba76cbbb0bac1d95b2aa4ee8af055470acbb7e
