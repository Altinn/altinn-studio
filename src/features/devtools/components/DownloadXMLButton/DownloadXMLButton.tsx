import React from 'react';
import Dropzone from 'react-dropzone';

import { Button, Fieldset } from '@digdir/designsystemet-react';
import { DownloadIcon, UploadIcon } from '@navikt/aksel-icons';
import axios from 'axios';

import { useCurrentDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { useIsInFormContext } from 'src/features/form/FormContext';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';

export function DownloadXMLButton() {
  const isInForm = useIsInFormContext();
  if (!isInForm) {
    return null;
  }

  return <InnerDownloadXMLButton />;
}

const InnerDownloadXMLButton = () => {
  const instance = useLaxInstanceData();
  const dataUrl = useCurrentDataModelUrl(false);

  const downloadXML = async () => {
    if (dataUrl) {
      const response = await axios.get(dataUrl, { headers: { Accept: 'application/xml' } });

      const blob = new Blob([response.data], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `${window.org}-${window.app}-${instance?.id ?? 'stateless'}.xml`);
      a.click();
    }
  };

  const uploadXML = async (acceptedFiles: File[]) => {
    if (dataUrl && acceptedFiles.length) {
      const data = await acceptedFiles[0].text();
      await axios.put(dataUrl, data, { headers: { 'Content-Type': 'application/xml' } }).catch((error) => {
        // 303 is expected when using ProcessDataWrite and can be ignored
        if (error.response?.status !== 303) {
          throw error;
        }
      });
      window.location.reload();
      // TODO(DevTools): Find a better way to reload the form data from server
      // The following will cause a fetch, but the data is not updated ↙
      // await window.queryClient.invalidateQueries(['fetchFormData']);
    }
  };
  return (
    <Fieldset legend='Skjemadata'>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          variant='secondary'
          size='small'
          onClick={downloadXML}
        >
          {
            <DownloadIcon
              fontSize='1rem'
              aria-hidden={true}
            />
          }
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
            >
              {
                <UploadIcon
                  fontSize='1rem'
                  aria-hidden={true}
                />
              }
              <input {...getInputProps()} />
              Last opp XML
            </Button>
          )}
        </Dropzone>
      </div>
    </Fieldset>
  );
};
