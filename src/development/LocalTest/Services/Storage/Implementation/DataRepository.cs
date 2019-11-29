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

            fs.CopyTo(data);
            data.Seek(0, SeekOrigin.Begin);
            byte[] buf = new byte[data.Length];
            data.Read(buf, 0, buf.Length);

            return Task.FromResult(data);
        }

        public Task<long> WriteDataToStorage(Stream dataStream, string fileName)
        {
            string filePath = GetFilePath(fileName);
            Directory.CreateDirectory(Path.GetDirectoryName(filePath));

            FileStream fileStream = File.Create(filePath, (int)dataStream.Length);
            // Initialize the bytes array with the stream length and then fill it with data
            byte[] bytesInStream = new byte[dataStream.Length];
            dataStream.Read(bytesInStream, 0, bytesInStream.Length);
            // Use write method to write to the file specified above
            fileStream.Write(bytesInStream, 0, bytesInStream.Length);
            //Close the filestream
            fileStream.Close();

            return Task.FromResult(long.Parse("1337"));
        }

        private string GetFilePath(string fileName)
        {
            return _localPlatformSettings.LocalTestingStorageBasePath + _localPlatformSettings.BlobStorageFolder + fileName;
        }
    }
}
