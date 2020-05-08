using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
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

            string jsonData = JsonConvert.SerializeObject(dataElement);
            using StreamWriter sw = new StreamWriter(GetDataBlobPath() + dataElement.BlobStoragePath + @".json");

            sw.Write(jsonData.ToString());
            sw.Close();

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
            throw new NotImplementedException();
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
            throw new NotImplementedException();
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


        private string GetDataPath(string org, string app, int instanceOwnerId, Guid instanceGuid)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DataRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Instances\", instanceOwnerId + @"\", instanceGuid.ToString() + @"\");
        }

        private string GetDataBlobPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DataRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\blob\");
        }
    }
}
