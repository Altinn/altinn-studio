import type {
  ExternalComponentBase,
  ExternalFormLayout,
  FormLayoutsResponse,
} from 'app-shared/types/api/FormLayoutsResponse';

/**
 * A component as it is stored in the layout file. The app builder edits the layout files directly,
 * without the internal format that ux-editor converts them to.
 */
export type LayoutComponent = ExternalComponentBase;

export type PageLayout = ExternalFormLayout<LayoutComponent>;

export type PageLayouts = FormLayoutsResponse<LayoutComponent>;

/** Texts for one language, keyed by text resource ID. */
export type TextsById = Record<string, string>;
