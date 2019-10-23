using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.Repositories;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class PolicyRepositoryTest : IClassFixture<PlatformAuthorizationFixture>
    {
        Mock<IOptions<AzureStorageConfiguration>> _settingsMock;

        public PolicyRepositoryTest(PlatformAuthorizationFixture fixture)
        {
            _settingsMock = new Mock<IOptions<AzureStorageConfiguration>>();
            _settingsMock.Setup(s => s.Value).Returns(new AzureStorageConfiguration()
            {
                AccountName = "devstoreaccount1",
                AccountKey = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
                StorageContainer = "metadata",
                BlobEndPoint = "http://127.0.0.1:10000/devstoreaccount1"
            });

        }

        [Fact]
        public async Task WritePolicy_TC01()
        {
            Stream dataStream = File.OpenRead("IIA003Policy.xml");
            PolicyRepository pr = new PolicyRepository(_settingsMock.Object);
            await pr.WritePolicy("testFile/testing", dataStream);
        }



    }
}
