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
  required?: ExprValToActualOrExpr<ExprVal.Boolean>;
  readOnly?: ExprValToActualOrExpr<ExprVal.Boolean>;
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

// Source hash: d84990394fd6a072d15086ea04100fe41869a8187256b6ea4eb2c9afd939183d
