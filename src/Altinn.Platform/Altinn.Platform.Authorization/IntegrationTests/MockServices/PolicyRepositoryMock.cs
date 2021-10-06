using System;
using System.IO;
using System.Net;
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
            return Task.FromResult(GetTestDataStream(filepath));
        }

        public Task<Stream> GetPolicyVersionAsync(string filepath, string version)
        {
            return Task.FromResult(GetTestDataStream(filepath));
        }

        public Task<Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream)
        {
            return WriteStreamToTestDataFolder(filepath, fileStream);            
        }

        public Task<Response> DeletePolicyVersionAsync(string filepath, string version)
        {
            throw new NotImplementedException();
        }

        public async Task<Response<BlobContentInfo>> WritePolicyConditionallyAsync(string filepath, Stream fileStream, string blobLeaseId)
        {
            if (blobLeaseId == "CorrectLeaseId")
            {
                return await WriteStreamToTestDataFolder(filepath, fileStream);
            }

            throw new RequestFailedException((int)HttpStatusCode.PreconditionFailed, "The condition specified using HTTP conditional header(s) is not met.");
        }

        public Task<string> TryAcquireBlobLease(string filepath)
        {
            return Task.FromResult("CorrectLeaseId");
        }

        public void ReleaseBlobLease(string filepath, string leaseId)
        {
        }

        private string GetDataBlobPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PolicyRepositoryMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, "../../../data/blobs/");
        }

        private Stream GetTestDataStream(string filepath)
        {
            string dataPath = Path.Combine(GetDataBlobPath(), filepath);
            Stream ms = new MemoryStream();
            if (File.Exists(dataPath))
            {
                using FileStream file = new FileStream(dataPath, FileMode.Open, FileAccess.Read);
                file.CopyTo(ms);
            }

            return ms;
        }

        private async Task<Response<BlobContentInfo>> WriteStreamToTestDataFolder(string filepath, Stream fileStream)
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

            BlobContentInfo mockedBlobInfo = BlobsModelFactory.BlobContentInfo(new ETag("ETagSuccess"), DateTime.Now, new byte[1], DateTime.Now.ToUniversalTime().ToString(), "encryptionKeySha256", "encryptionScope", 1);
            Mock<Response<BlobContentInfo>> mockResponse = new Mock<Response<BlobContentInfo>>();
            mockResponse.SetupGet(r => r.Value).Returns(mockedBlobInfo);

            Mock<Response> responseMock = new Mock<Response>();
            responseMock.SetupGet(r => r.Status).Returns((int)HttpStatusCode.Created);
            mockResponse.Setup(r => r.GetRawResponse()).Returns(responseMock.Object);

            return mockResponse.Object;
        }
    }
}
