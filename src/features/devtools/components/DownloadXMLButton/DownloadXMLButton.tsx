import React, { useState } from 'react';
import Dropzone from 'react-dropzone';

import { Combobox, Fieldset } from '@digdir/designsystemet-react';
import { DownloadIcon, UploadIcon } from '@navikt/aksel-icons';
import axios from 'axios';

import { Button } from 'src/app-components/Button/Button';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useIsInFormContext } from 'src/features/form/FormContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { getStatefulDataModelUrl } from 'src/utils/urls/appUrlHelper';

export function DownloadXMLButton() {
  const isInForm = useIsInFormContext();
  const isStateless = useApplicationMetadata().isStatelessApp;
  if (!isInForm || isStateless) {
    return null;
  }

  return <InnerDownloadXMLButton />;
}

const InnerDownloadXMLButton = () => {
  const instanceId = useLaxInstanceId();
  const writableDataTypes = DataModels.useWritableDataTypes();
  const getDataElementIdForDataType = DataModels.useGetDataElementIdForDataType();
  const [selectedDataType, setSelectedDataType] = useState(writableDataTypes?.at(0));
  const disabled = !selectedDataType;

  const lock = FD.useLocking('__dev_tools__');

  const downloadXML = async () => {
    const dataElementId = selectedDataType ? getDataElementIdForDataType(selectedDataType) : undefined;
    const dataUrl = dataElementId && instanceId ? getStatefulDataModelUrl(instanceId, dataElementId, true) : undefined;
    if (dataUrl) {
      const response = await axios.get(dataUrl, { headers: { Accept: 'application/xml' } });

      const blob = new Blob([response.data], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `${window.org}-${window.app}-${instanceId ?? 'stateless'}-${selectedDataType}.xml`);
      a.click();
    }
  };

  const uploadXML = async (acceptedFiles: File[]) => {
    const dataElementId = selectedDataType ? getDataElementIdForDataType(selectedDataType) : undefined;
    const dataUrl = dataElementId && instanceId ? getStatefulDataModelUrl(instanceId, dataElementId, true) : undefined;
    if (dataUrl && acceptedFiles.length) {
      const currentLock = await lock();
      try {
        const dataToUpload = await acceptedFiles[0].text();
        await axios.put(dataUrl, dataToUpload, { headers: { 'Content-Type': 'application/xml' } }).catch((error) => {
          // 303 is expected when using ProcessDataWrite and can be ignored
          if (error.response?.status !== 303) {
            throw error;
          }
        });
        const { data: updatedDataModel } = await axios.get(dataUrl, {
          headers: { Accept: 'application/json' },
        });
        currentLock.unlock({ updatedDataModels: { [dataElementId!]: updatedDataModel }, updatedValidationIssues: {} });
      } catch {
        currentLock.unlock();
      }
    }
  };
  return (
    <Fieldset>
      <Fieldset.Legend>Skejmadata</Fieldset.Legend>
      {writableDataTypes?.length > 1 && (
        <Combobox
          size='sm'
          value={selectedDataType ? [selectedDataType] : []}
          onValueChange={(values) => setSelectedDataType(values.at(0))}
        >
          {writableDataTypes.map((dataType) => (
            <Combobox.Option
              key={dataType}
              value={dataType}
              displayValue={dataType}
            >
              {dataType}
            </Combobox.Option>
          ))}
        </Combobox>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          variant='secondary'
          onClick={downloadXML}
          disabled={disabled}
        >
          <DownloadIcon
            fontSize='1rem'
            aria-hidden={true}
          />
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
              disabled={disabled}
            >
              <UploadIcon
                fontSize='1rem'
                aria-hidden={true}
              />
              <input {...getInputProps()} />
              Last opp XML
            </Button>
          )}
        </Dropzone>
      </div>
    </Fieldset>
  );
};
