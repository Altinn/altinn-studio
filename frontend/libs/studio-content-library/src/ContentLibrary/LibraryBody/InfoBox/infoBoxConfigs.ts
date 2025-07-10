import type { PageName } from '../../../types/PageName';
import type { InfoBoxProps } from '../../../types/InfoBoxProps';
import codeListIllustrationSvg from '/assets/Altinn-studio-code-list-illustration.svg';
import imagesIllustrationSvg from '/assets/Altinn-studio-images-illustration.svg';

export type InfoBoxConfigs = Partial<{ [T in PageName]: InfoBoxProps }>;

export const infoBoxConfigs: InfoBoxConfigs = {
  codeList: {
    titleTextKey: 'app_content_library.code_lists.info_box.title',
    descriptionTextKey: 'app_content_library.code_lists.info_box.description',
    illustrationReference: codeListIllustrationSvg,
  },
  images: {
    titleTextKey: 'app_content_library.images.info_box.title',
    descriptionTextKey: 'app_content_library.images.info_box.description',
    illustrationReference: imagesIllustrationSvg,
  },
};
