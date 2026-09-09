import {
  ComponentBase,
  FormComponentPropsWithRequired,
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
  FormComponentPropsWithRequired &
  SummarizableComponentProps &
  LabeledComponentProps;

// Source hash: 63b754ed4ef2afe175c53b6b85b4ad2d5fdd9481374e1c5ae49a52eb23bbf954
