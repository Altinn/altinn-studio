import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useGetAllImagesQuery } from 'app-shared/hooks/queries/useGetAllImagesQuery';
import { Card } from '@digdir/designsystemet-react';

export const ChooseFromLibrary = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: images } = useGetAllImagesQuery(org, app);
  return images.map((image) => (
    <Card key={image}>
      <Card.Media>
        <img src={image} alt='' />
      </Card.Media>
    </Card>
  ));
};
