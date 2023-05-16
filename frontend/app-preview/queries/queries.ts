import { get } from "app-shared/utils/networking";
import {
  instanceIdForPreviewPath,
} from 'app-shared/api-paths';

export const getInstanceIdForPreview = (owner: string, app: string) => get(instanceIdForPreviewPath(owner, app));
