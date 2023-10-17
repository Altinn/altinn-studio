import React from 'react';
import Dropzone from 'react-dropzone';
import { useDispatch } from 'react-redux';

import { Button, Fieldset } from '@digdir/design-system-react';
import { DownloadIcon, UploadIcon } from '@navikt/aksel-icons';
import axios from 'axios';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { getFetchFormDataUrl } from 'src/utils/urls/appUrlHelper';

export const DownloadXMLButton = () => {
  const appMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const instance = useAppSelector((state) => state.instanceData.instance);
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);
  const dataElementId = getCurrentTaskDataElementId(appMetadata, instance, layoutSets);
  const dispatch = useDispatch();

  const downloadXML = async () => {
    if (instance?.id && dataElementId) {
      const dataUrl = getFetchFormDataUrl(instance?.id, dataElementId);
      const response = await axios.get(dataUrl, { headers: { Accept: 'application/xml' } });

      const blob = new Blob([response.data], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `${window.org}-${window.app}-${instance.id}.xml`);
      a.click();
    }
  };

  const uploadXML = async (acceptedFiles: File[]) => {
    if (instance?.id && dataElementId && acceptedFiles.length) {
      const data = await acceptedFiles[0].text();
      const dataUrl = getFetchFormDataUrl(instance?.id, dataElementId);
      await axios.put(dataUrl, data, { headers: { 'Content-Type': 'application/xml' } }).catch((error) => {
        // 303 is expected when using ProcessDataWrite and can be ignored
        if (error.response?.status !== 303) {
          throw error;
        }
      });
      dispatch(FormDataActions.fetch({ url: dataUrl }));
    }
  };
  return (
    <Fieldset legend='Skjemadata'>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          variant='secondary'
          size='small'
          icon={<DownloadIcon aria-hidden={true} />}
          onClick={downloadXML}
        >
          Last ned XML
        </Button>
        <Dropzone
          multiple={false}
          onDrop={uploadXML}
          accept={{ 'application/xml': ['.xml'] }}
        >
          {({ getRootProps, getInputProps }) => (
            <Button
              {...getRootProps({
                onClick: (e) => e.preventDefault(),
              })}
              variant='secondary'
              size='small'
              icon={<UploadIcon aria-hidden={true} />}
            >
              <input {...getInputProps()} />
              Last opp XML
            </Button>
          )}
        </Dropzone>
      </div>
    </Fieldset>
  );
};
