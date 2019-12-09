using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.IO;
using System.Threading.Tasks;

namespace LocalTest.Services.Storage.Implementation
{
    public class DataRepository : IDataRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public DataRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public Task<bool> DeleteDataInStorage(string fileName)
        {
            throw new NotImplementedException();
        }

        public Task<Stream> ReadDataFromStorage(string fileName)
        {
            string filePath = GetFilePath(fileName);
            Stream fs = File.OpenRead(filePath);

            System.IO.Stream data = new System.IO.MemoryStream();

            return Task.FromResult(fs);
        }

        public async Task<long> WriteDataToStorage(Stream dataStream, string fileName)
        {
            string filePath = GetFilePath(fileName);
            if (!Directory.Exists(Path.GetDirectoryName(filePath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(filePath));
            }

            long filesize;

            using (Stream streamToWriteTo = File.Open(filePath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                await dataStream.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = streamToWriteTo.Length;
            }

            return filesize;
        }

        private string GetFilePath(string fileName)
        {
            return _localPlatformSettings.LocalTestingStorageBasePath + _localPlatformSettings.BlobStorageFolder + fileName;
        }
    }
}
