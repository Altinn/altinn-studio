export const MAX_ZOOM = 5;
// Always save canvas as PNG to preserve transparency; JPEG is not suitable for circular crops
export const IMAGE_TYPE = 'image/png';

export type Position = { x: number; y: number };
export enum CropForm {
  Rectangle = 'rectangle',
  Circle = 'circle',
}

/** Circular cropping area. `diameter` defaults to 250. */
export type CropConfigCircle = { shape: 'circle'; diameter?: number };
/** Rectangular cropping area. `width`/`height` default to 250. */
export type CropConfigRect = { shape: 'rectangle'; width?: number; height?: number };
/** The Studio-configurable cropping area. */
export type CropConfig = CropConfigCircle | CropConfigRect;

/**
 * A stored image attachment. This is the minimal shape the presentational layer needs; the app
 * runtime passes its richer `UploadedAttachment`, which is structurally compatible.
 */
export type StoredImage = {
  uploaded: boolean;
  deleting?: boolean;
  data: { id: string; filename?: string };
};

export type CropInternal = {
  width: number;
  height: number;
  shape: CropForm.Rectangle | CropForm.Circle;
};
export const getCropArea = (crop?: CropConfig): CropInternal => {
  const defaultSize = 250;

  if (!crop) {
    return { width: defaultSize, height: defaultSize, shape: CropForm.Circle };
  }

  const isCircle = !crop?.shape || crop.shape === CropForm.Circle;

  const width =
    (isCircle ? (crop as CropConfigCircle).diameter : (crop as CropConfigRect).width) ??
    defaultSize;
  const height =
    (isCircle ? (crop as CropConfigCircle).diameter : (crop as CropConfigRect).height) ??
    defaultSize;
  const shape = isCircle ? CropForm.Circle : CropForm.Rectangle;

  return { width, height, shape };
};

interface ConstrainToAreaParams {
  image: HTMLImageElement;
  zoom: number;
  position: Position;
  cropArea: CropInternal;
}

export function constrainToArea({
  image,
  zoom,
  position,
  cropArea,
}: ConstrainToAreaParams): Position {
  const scaledWidth = image.width * zoom;
  const scaledHeight = image.height * zoom;

  const clampX = scaledWidth > cropArea.width ? (scaledWidth - cropArea.width) / 2 : 0;
  const clampY = scaledHeight > cropArea.height ? (scaledHeight - cropArea.height) / 2 : 0;

  const newX = Math.max(-clampX, Math.min(position.x, clampX));
  const newY = Math.max(-clampY, Math.min(position.y, clampY));

  return { x: newX, y: newY };
}

interface ImagePlacementParams {
  canvas: HTMLCanvasElement;
  img: HTMLImageElement;
  zoom: number;
  position: Position;
}

export const imagePlacement = ({ canvas, img, zoom, position }: ImagePlacementParams) => {
  const scaledWidth = img.width * zoom;
  const scaledHeight = img.height * zoom;
  const imgX = (canvas.width - scaledWidth) / 2 + position.x;
  const imgY = (canvas.height - scaledHeight) / 2 + position.y;

  return { imgX, imgY, scaledWidth, scaledHeight };
};

type CropAreaPlacementParams = { canvas: HTMLCanvasElement; cropArea: CropInternal };
type CropAreaPlacement = { cropAreaX: number; cropAreaY: number };

export const cropAreaPlacement = ({
  canvas,
  cropArea,
}: CropAreaPlacementParams): CropAreaPlacement => {
  const cropAreaX = (canvas.width - cropArea.width) / 2;
  const cropAreaY = (canvas.height - cropArea.height) / 2;
  return { cropAreaX, cropAreaY };
};

interface DrawCropAreaParams {
  ctx: CanvasRenderingContext2D;
  cropArea: CropInternal;
  x?: number;
  y?: number;
}

export function drawCropArea({ ctx, x = 0, y = 0, cropArea }: DrawCropAreaParams) {
  const { width, height, shape } = cropArea;
  ctx.beginPath();
  if (shape === CropForm.Circle) {
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
  } else {
    ctx.rect(x, y, width, height);
  }
}

interface ZoomParams {
  minZoom: number;
  maxZoom: number;
}

interface CalculateZoomParams extends ZoomParams {
  value: number;
}

function getLogValues({ minZoom, maxZoom }: ZoomParams): { logScale: number; logMin: number } {
  const logMin = Math.log(minZoom);
  const logMax = Math.log(maxZoom);
  return { logScale: (logMax - logMin) / 100, logMin };
}

export function normalToLogZoom({ value, minZoom, maxZoom }: CalculateZoomParams): number {
  const { logScale, logMin } = getLogValues({ minZoom, maxZoom });
  return Math.exp(logMin + logScale * value);
}

export function logToNormalZoom({ value, minZoom, maxZoom }: CalculateZoomParams): number {
  const { logScale, logMin } = getLogValues({ minZoom, maxZoom });
  if (logScale === 0) {
    return 0;
  }
  return (Math.log(value) - logMin) / logScale;
}

type CalculateMinZoomParams = { cropArea: CropInternal; img: HTMLImageElement };
export const calculateMinZoom = ({ img, cropArea }: CalculateMinZoomParams) =>
  Math.max(cropArea.width / img.width, cropArea.height / img.height);

export const validateFile = (file?: File): string[] => {
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const errors: string[] = [];

  const typeError = 'image_upload_component.error_invalid_file_type';
  const sizeError = 'image_upload_component.error_file_size_exceeded';

  if (!file) {
    errors.push(typeError);
    return errors;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push(sizeError);
  }

  const isTypeInvalid = !file.type.startsWith('image/');
  if (isTypeInvalid) {
    errors.push(typeError);
  }

  return errors;
};

export const isAnimationFile = (fileType: string): boolean => {
  const animationMimeTypes = ['image/gif', 'image/apng', 'image/webp'];
  return animationMimeTypes.includes(fileType.toLowerCase());
};

export const getNewFileName = ({ fileName }: { fileName: string }) => {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
  return `${nameWithoutExtension}.png`;
};

type CalculateNewPositionProps = {
  canvas: HTMLCanvasElement;
  img: HTMLImageElement;
  position: Position;
  oldZoom: number;
  newZoom: number;
  cropArea: CropInternal;
};

export const calculatePositionForZoom = ({
  canvas,
  img,
  position,
  oldZoom,
  newZoom,
  cropArea,
}: CalculateNewPositionProps) => {
  const viewportCenterX = canvas.width / 2;
  const viewportCenterY = canvas.height / 2;

  const { imgX, imgY } = imagePlacement({ canvas, img, zoom: oldZoom, position });
  const imageCenterX = (viewportCenterX - imgX) / oldZoom;
  const imageCenterY = (viewportCenterY - imgY) / oldZoom;

  const newPosition = {
    x: viewportCenterX - imageCenterX * newZoom - (canvas.width - img.width * newZoom) / 2,
    y: viewportCenterY - imageCenterY * newZoom - (canvas.height - img.height * newZoom) / 2,
  };
  return constrainToArea({ image: img, zoom: newZoom, position: newPosition, cropArea });
};
