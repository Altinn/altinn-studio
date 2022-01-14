using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;

using Microsoft.Azure.Documents;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public class DataRepositoryMock : IDataRepository
    {
        public async Task<DataElement> Create(DataElement dataElement)
        {
            return await Task.FromResult(dataElement);
        }

        public async Task<bool> Delete(DataElement dataElement)
        {
            return await Task.FromResult(true);
        }

        public async Task<bool> DeleteDataInStorage(string org, string blobStoragePath)
        {
            return await Task.FromResult(true);
        }

        public async Task<DataElement> Read(Guid instanceGuid, Guid dataElementId)
        {
            DataElement dataElement = null;

            lock (TestDataUtil.DataLock)
            {
                string elementPath = Path.Combine(GetDataElementsPath(), dataElementId.ToString() + ".json");
                if (File.Exists(elementPath))
                {
                    string content = File.ReadAllText(elementPath);
                    dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                }
            }

            if (dataElement != null)
            {
                return await Task.FromResult(dataElement);
            }

            throw CreateDocumentClientExceptionForTesting("Not Found", HttpStatusCode.NotFound);
        }

        public async Task<List<DataElement>> ReadAll(Guid instanceGuid)
        {
            List<DataElement> dataElements = new List<DataElement>();
            string dataElementsPath = GetDataElementsPath();

            string[] dataElementPaths = Directory.GetFiles(dataElementsPath);
            foreach (string elementPath in dataElementPaths)
            {
                string content = File.ReadAllText(elementPath);
                DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                if (dataElement.InstanceGuid.Contains(instanceGuid.ToString()))
                {
                    dataElements.Add(dataElement);
                }
            }

            return await Task.FromResult(dataElements);
        }

        public async Task<Stream> ReadDataFromStorage(string org, string blobStoragePath)
        {
            string dataPath = GetDataBlobPath() + blobStoragePath;
            Stream fs = File.OpenRead(dataPath);

            return await Task.FromResult(fs);
        }

        public async Task<DataElement> Update(DataElement dataElement)
        {
            return await Task.FromResult(dataElement);
        }

        public async Task<long> WriteDataToStorage(string org, Stream stream, string blobStoragePath)
        {
            MemoryStream memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream);
            return memoryStream.Length;
        }

        private static string GetDataElementsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DataRepositoryMock).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\dataelements\");
        }

        private static string GetDataBlobPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DataRepositoryMock).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\blob\");
        }

        private static DocumentClientException CreateDocumentClientExceptionForTesting(string message, HttpStatusCode httpStatusCode)
        {
            Type type = typeof(DocumentClientException);

            string fullName = type.FullName ?? "wtf?";

            object documentClientExceptionInstance = type.Assembly.CreateInstance(
                fullName,
                false,
                BindingFlags.Instance | BindingFlags.NonPublic,
                null,
                new object[] { message, null, null, httpStatusCode, null },
                null,
                null);

            return (DocumentClientException)documentClientExceptionInstance;
        }
    }
}
