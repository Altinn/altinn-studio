import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useUploaderSummaryData } from 'src/layout/FileUpload/Summary/summary';
import { useImageFile } from 'src/layout/ImageUpload/hooks/useImageFile';
import classes from 'src/layout/ImageUpload/ImageUploadSummary2/ImageUploadSummary2.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function ImageUploadSummary2({ targetBaseComponentId }: Summary2Props) {
  const attachment = useUploaderSummaryData(targetBaseComponentId);
  const { required, textResourceBindings } = useItemWhenType(targetBaseComponentId, 'ImageUpload');
  const isCompact = useSummaryProp('isCompact');
  const { storedImage } = useImageFile(targetBaseComponentId);
  const isEmpty = attachment.length === 0;
  const title = textResourceBindings?.title;
  const emptyValueText = required ? SummaryContains.EmptyValueRequired : SummaryContains.EmptyValueNotRequired;
  const contentLogic = isEmpty ? emptyValueText : SummaryContains.SomeUserContent;
  const imageElement = storedImage ? <ImageToDisplay targetBaseComponentId={targetBaseComponentId} /> : undefined;

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={contentLogic}
    >
      <SingleValueSummary
        title={<Lang id={title} />}
        targetBaseComponentId={targetBaseComponentId}
        displayData={imageElement && <ImageToDisplay targetBaseComponentId={targetBaseComponentId} />}
        hideEditButton={false}
        isCompact={isCompact}
        emptyFieldText='image_upload_component.summary_empty'
      />
    </SummaryFlex>
  );
}

interface ImageToDisplayProps {
  targetBaseComponentId: string;
}

const ImageToDisplay = ({ targetBaseComponentId }: ImageToDisplayProps) => {
  const { imageUrl, storedImage } = useImageFile(targetBaseComponentId);

  return (
    <img
      src={imageUrl}
      alt={storedImage!.data?.filename}
      className={classes.image}
    />
  );
};
