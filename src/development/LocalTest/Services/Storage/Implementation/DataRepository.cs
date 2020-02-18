using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

using LocalTest.Configuration;

using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace LocalTest.Services.Storage.Implementation
{
    public class DataRepository : IDataRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public DataRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public Task<DataElement> Create(DataElement dataElement)
        {
            string path = GetDataPath(dataElement.InstanceGuid, dataElement.Id);
            Directory.CreateDirectory(GetDataCollectionFolder());
            Directory.CreateDirectory(GetDataForInstanceFolder(dataElement.InstanceGuid));
            File.WriteAllText(path, dataElement.ToString());
            return Task.FromResult(dataElement);
        }

        public Task<bool> Delete(DataElement dataElement)
        {
            throw new NotImplementedException();
        }

        public Task<bool> DeleteDataInStorage(string org, string blobStoragePath)
        {
            throw new NotImplementedException();
        }

        public Task<DataElement> Read(Guid instanceGuid, Guid dataElementId)
        {
            string dataPath = GetDataPath(instanceGuid.ToString(), dataElementId.ToString());
            string content = File.ReadAllText(dataPath);
            DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
            return Task.FromResult(dataElement);
        }

        public Task<List<DataElement>> ReadAll(Guid instanceGuid)
        {
            List<DataElement> dataElements = new List<DataElement>();
            string path = GetDataForInstanceFolder(instanceGuid.ToString());
            if (Directory.Exists(path))
            {
                string[] files = Directory.GetFiles(path);
                for (int i = 0; i < files.Length; i++)
                {
                    string content = File.ReadAllText(files[i]);
                    DataElement instance = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                    dataElements.Add(instance);
                }
            }
            return Task.FromResult(dataElements);
        }

        public Task<Stream> ReadDataFromStorage(string org, string blobStoragePath)
        {
            string filePath = GetFilePath(blobStoragePath);
            Stream fs = File.OpenRead(filePath);

            return Task.FromResult(fs);
        }

        public Task<DataElement> Update(DataElement dataElement)
        {
            string path = GetDataPath(dataElement.InstanceGuid, dataElement.Id);
            Directory.CreateDirectory(GetDataCollectionFolder());
            Directory.CreateDirectory(GetDataForInstanceFolder(dataElement.InstanceGuid));
            File.WriteAllText(path, dataElement.ToString());
            return Task.FromResult(dataElement);
        }

        public async Task<long> WriteDataToStorage(string org, Stream stream, string blobStoragePath)
        {
            string filePath = GetFilePath(blobStoragePath);
            if (!Directory.Exists(Path.GetDirectoryName(filePath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(filePath));
            }

            long filesize;

            using (Stream streamToWriteTo = File.Open(filePath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                await stream.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = streamToWriteTo.Length;
            }

            return filesize;
        }

        private string GetFilePath(string fileName)
        {
            return _localPlatformSettings.LocalTestingStorageBasePath + _localPlatformSettings.BlobStorageFolder + fileName;
        }

        private string GetDataPath(string instanceId, string dataId)
        {
            return Path.Combine(GetDataForInstanceFolder(instanceId) + dataId.Replace("/", "_") + ".json");
        }

        private string GetDataForInstanceFolder(string instanceId)
        {
            return Path.Combine(GetDataCollectionFolder() + instanceId.Replace("/", "_") + "/"); 
        }


        private string GetDataCollectionFolder()
        {
            return this._localPlatformSettings.LocalTestingStorageBasePath + this._localPlatformSettings.DocumentDbFolder + this._localPlatformSettings.DataCollectionFolder;
        }
    }
}
