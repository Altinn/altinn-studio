using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Authorization.Repositories.Interface;
using Azure;
using Azure.Storage.Blobs.Models;
using Moq;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class PolicyRepositoryMock : IPolicyRepository
    {
        public Task<Stream> GetPolicyAsync(string filepath)
        {
            string dataPath = Path.Combine(GetDataBlobPath(), filepath);
            Stream ms = new MemoryStream();
            if (File.Exists(dataPath))
            {
                using (FileStream file = new FileStream(dataPath, FileMode.Open, FileAccess.Read))
                {
                    file.CopyTo(ms);
                }

                return Task.FromResult(ms);
            }

            return Task.FromResult(ms);
        }

        public async Task<Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream)
        {
            string dataPath = GetDataBlobPath() + filepath;

            if (!Directory.Exists(Path.GetDirectoryName(dataPath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(dataPath));
            }

            int filesize;

            using (Stream streamToWriteTo = File.Open(dataPath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.ReadWrite))
            {
                await fileStream.CopyToAsync(streamToWriteTo);
                streamToWriteTo.Flush();
                filesize = (int)streamToWriteTo.Length;
            }

            BlobContentInfo mockedBlobInfo = BlobsModelFactory.BlobContentInfo(new ETag("etag"), DateTime.Now, new byte[1], "1", "encryptionKeySha256", "encryptionScope", 1);
            Mock<Response<BlobContentInfo>> mockResponse = new Mock<Response<BlobContentInfo>>();
            mockResponse.SetupGet(r => r.Value).Returns(mockedBlobInfo);

            return mockResponse.Object;
        }

        private string GetDataBlobPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PolicyRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, "../../../data/blobs/");
        }
    }
}
