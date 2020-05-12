using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public class DataRepositoryMock : IDataRepository
    {
        public Task<DataElement> Create(DataElement dataElement)
        {
            lock (TestDataUtil.dataLock)
            {
                Directory.CreateDirectory(GetDataElementsPath());

                string jsonData = JsonConvert.SerializeObject(dataElement);
                using StreamWriter sw = new StreamWriter(GetDataElementsPath() + dataElement.Id + @".json");

                sw.Write(jsonData.ToString());
                sw.Close();

                return Task.FromResult(dataElement);
            }
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
            lock (TestDataUtil.dataLock)
            {
                string elementPath = Path.Combine(GetDataElementsPath(), dataElementId.ToString() + ".json");
                string content = System.IO.File.ReadAllText(elementPath);
                DataElement dataElement = (DataElement)JsonConvert.DeserializeObject(content, typeof(DataElement));
                return Task.FromResult(dataElement);
            }
        }

        public Task<List<DataElement>> ReadAll(Guid instanceGuid)
        {
            throw new NotImplementedException();
        }

        public Task<Stream> ReadDataFromStorage(string org, string blobStoragePath)
        {
            throw new NotImplementedException();
        }

        public Task<DataElement> Update(DataElement dataElement)
        {
            Directory.CreateDirectory(GetDataElementsPath());

            string jsonData = JsonConvert.SerializeObject(dataElement);
            using StreamWriter sw = new StreamWriter(GetDataElementsPath() + dataElement.Id + @".json");

            sw.Write(jsonData.ToString());
            sw.Close();

            return Task.FromResult(dataElement);
        }

        public async Task<long> WriteDataToStorage(string org, Stream stream, string blobStoragePath)
        {
                 Guid dataGuid = Guid.NewGuid();
                string dataPath = GetDataBlobPath() + blobStoragePath;

                if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(dataPath));
                }

                long filesize;

                using (Stream streamToWriteTo = File.Open(dataPath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
                {
                    await stream.CopyToAsync(streamToWriteTo);
                    streamToWriteTo.Flush();
                    filesize = streamToWriteTo.Length;
                }

                return filesize;

        }


        private string GetDataElementsPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DataRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\dataelements\");
        }

        private string GetDataBlobPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DataRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\blob\");
        }
    }
}
