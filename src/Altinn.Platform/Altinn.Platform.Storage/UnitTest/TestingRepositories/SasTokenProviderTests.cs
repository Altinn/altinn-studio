using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Wrappers;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingRepositories
{
    public class SasTokenProviderTests
    {
        private const string KeyVaultURI = "OrgKeyVaultURI_{0}";
        private const string StorageAccount = "OrgStorageAccount_{0}";
        private const string SasDefinition = "OrgSasDefinition_{0}";

        private readonly Mock<ILogger<SasTokenProvider>> _mockLogger;
        private readonly Mock<IOptions<AzureStorageConfiguration>> _storageConfiguration;

        public SasTokenProviderTests()
        {
            _mockLogger= new Mock<ILogger<SasTokenProvider>>();

            AzureStorageConfiguration storageSettings = new AzureStorageConfiguration
            {
                OrgKeyVaultURI = KeyVaultURI,
                OrgStorageAccount = StorageAccount,
                OrgSasDefinition = SasDefinition,
                AllowedSasTokenAgeHours = 1
            };

            _storageConfiguration = new Mock<IOptions<AzureStorageConfiguration>>();
            _storageConfiguration.SetupGet(x => x.Value).Returns(storageSettings);
        }

        [Fact]
        public async Task GetSasToken_InputValidOrgId_ReturnsCorrectSasToken()
        {
            // Arrange
            string org = "ttd";
            string uri = string.Format(KeyVaultURI, org);

            string storageAccount = string.Format(StorageAccount, org);
            string sasDefinition = string.Format(SasDefinition, org);
            string secretName = $"{storageAccount}-{sasDefinition}";

            Mock<IKeyVaultClientWrapper> keyVaultClient = new Mock<IKeyVaultClientWrapper>();
            keyVaultClient.Setup(s => s.GetSecretAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("ttdsecret");

            SasTokenProvider target = new SasTokenProvider(keyVaultClient.Object, _storageConfiguration.Object, _mockLogger.Object);

            // Act
            string actual = await target.GetSasToken(org);

            // Assert
            Assert.Equal("ttdsecret", actual);

            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri), It.Is<string>(i => i == secretName)), Times.Once);
        }

        [Fact]
        public async Task GetSasToken_InputSameOrgIdTwice_KeyVaultCalledOnlyOnce()
        {
            // Arrange
            string org = "ttd";
            string uri = string.Format(KeyVaultURI, org);

            string storageAccount = string.Format(StorageAccount, org);
            string sasDefinition = string.Format(SasDefinition, org);
            string secretName = $"{storageAccount}-{sasDefinition}";

            Mock<IKeyVaultClientWrapper> keyVaultClient = new Mock<IKeyVaultClientWrapper>();
            keyVaultClient.Setup(s => s.GetSecretAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("ttdsecret");

            SasTokenProvider target = new SasTokenProvider(keyVaultClient.Object, _storageConfiguration.Object, _mockLogger.Object);

            // Act
            _ = await target.GetSasToken(org);
            string actual = await target.GetSasToken(org);

            // Assert
            Assert.Equal("ttdsecret", actual);

            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri), It.Is<string>(i => i == secretName)), Times.Once);
        }

        [Fact]
        public async Task GetSasToken_InputTwoDifferentOrgId_KeyVaultCalledTwice()
        {
            // Arrange
            string org_ttd = "ttd";
            string uri_ttd = string.Format(KeyVaultURI, org_ttd);

            string storageAccount_ttd = string.Format(StorageAccount, org_ttd);
            string sasDefinition_ttd = string.Format(SasDefinition, org_ttd);
            string secretName_ttd = $"{storageAccount_ttd}-{sasDefinition_ttd}";

            string org_brg = "brg";
            string uri_brg = string.Format(KeyVaultURI, org_brg);

            string storageAccount_brg = string.Format(StorageAccount, org_brg);
            string sasDefinition_brg = string.Format(SasDefinition, org_brg);
            string secretName_brg = $"{storageAccount_brg}-{sasDefinition_brg}";

            Mock<IKeyVaultClientWrapper> keyVaultClient = new Mock<IKeyVaultClientWrapper>();
            keyVaultClient.Setup(s => s.GetSecretAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("secret");

            SasTokenProvider target = new SasTokenProvider(keyVaultClient.Object, _storageConfiguration.Object, _mockLogger.Object);

            // Act
            await target.GetSasToken(org_ttd);
            await target.GetSasToken(org_brg);

            // Assert
            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri_ttd), It.Is<string>(i => i == secretName_ttd)), Times.Once);
            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri_brg), It.Is<string>(i => i == secretName_brg)), Times.Once);
        }

        [Fact]
        public async Task GetSasToken_MultiThread()
        {
            // Arrange
            string org_ttd = "ttd";
            string uri_ttd = string.Format(KeyVaultURI, org_ttd);

            string storageAccount_ttd = string.Format(StorageAccount, org_ttd);
            string sasDefinition_ttd = string.Format(SasDefinition, org_ttd);
            string secretName_ttd = $"{storageAccount_ttd}-{sasDefinition_ttd}";

            string org_brg = "brg";
            string uri_brg = string.Format(KeyVaultURI, org_brg);

            string storageAccount_brg = string.Format(StorageAccount, org_brg);
            string sasDefinition_brg = string.Format(SasDefinition, org_brg);
            string secretName_brg = $"{storageAccount_brg}-{sasDefinition_brg}";

            Mock<IKeyVaultClientWrapper> keyVaultClient = new Mock<IKeyVaultClientWrapper>();
            keyVaultClient.Setup(s => s.GetSecretAsync(It.IsAny<string>(), It.Is<string>(i => i == secretName_ttd))).ReturnsAsync("ttdsecret");
            keyVaultClient.Setup(s => s.GetSecretAsync(It.IsAny<string>(), It.Is<string>(i => i == secretName_brg))).ReturnsAsync("brgsecret");

            SasTokenProvider target = new SasTokenProvider(keyVaultClient.Object, _storageConfiguration.Object, _mockLogger.Object);

            // Act
            ManualResetEvent mre = new ManualResetEvent(false);
            List<Task> tasks = new List<Task>();
            for (int i = 0; i < 5; i++)
            {
                Task task1 = Task.Run(async delegate
                {
                    mre.WaitOne();
                    await target.GetSasToken(org_ttd);
                });

                tasks.Add(task1);

                Task task2 = Task.Run(async delegate
                {
                    mre.WaitOne();
                    await target.GetSasToken(org_brg);
                });

                tasks.Add(task2);
            }

            // Run all tasks.
            mre.Set();
            await Task.WhenAll(tasks);

            string ttdSecret = await target.GetSasToken(org_ttd);
            string brgSecret = await target.GetSasToken(org_brg);

            // Assert
            Assert.Equal("ttdsecret", ttdSecret);
            Assert.Equal("brgsecret", brgSecret);

            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri_ttd), It.Is<string>(i => i == secretName_ttd)), Times.Once);
            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri_brg), It.Is<string>(i => i == secretName_brg)), Times.Once);
        }

        [Fact]
        public async Task InvalidateSasToken_InvalidatingTokenBetweenCalls_PerformsTwoCallsToKeyVault()
        {
            // Arrange
            string org = "ttd";
            string uri = string.Format(KeyVaultURI, org);

            string storageAccount = string.Format(StorageAccount, org);
            string sasDefinition = string.Format(SasDefinition, org);
            string secretName = $"{storageAccount}-{sasDefinition}";

            Mock<IKeyVaultClientWrapper> keyVaultClient = new Mock<IKeyVaultClientWrapper>();
            keyVaultClient.Setup(s => s.GetSecretAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("ttdsecret");

            SasTokenProvider target = new SasTokenProvider(keyVaultClient.Object, _storageConfiguration.Object, _mockLogger.Object);

            // Act
            await target.GetSasToken(org);
            target.InvalidateSasToken(org);

            string actual = await target.GetSasToken(org);

            // Assert
            Assert.Equal("ttdsecret", actual);

            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri), It.Is<string>(i => i == secretName)), Times.Exactly(2));
        }

        [Fact]
        public async Task GetSasToken_TokenExpiresBetweenCalls_PerformsTwoCallsToKeyVault()
        {
            // Arrange
            string org = "ttd";
            string uri = string.Format(KeyVaultURI, org);

            string storageAccount = string.Format(StorageAccount, org);
            string sasDefinition = string.Format(SasDefinition, org);
            string secretName = $"{storageAccount}-{sasDefinition}";

            Mock<IKeyVaultClientWrapper> keyVaultClient = new Mock<IKeyVaultClientWrapper>();
            keyVaultClient.Setup(s => s.GetSecretAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("ttdsecret");

            AzureStorageConfiguration storageSettings = new AzureStorageConfiguration
            {
                OrgKeyVaultURI = KeyVaultURI,
                OrgStorageAccount = StorageAccount,
                OrgSasDefinition = SasDefinition,
                AllowedSasTokenAgeHours = 0
            };

            Mock<IOptions<AzureStorageConfiguration>> storageConfiguration = new Mock<IOptions<AzureStorageConfiguration>>();
            storageConfiguration.SetupGet(x => x.Value).Returns(storageSettings);

            SasTokenProvider target = new SasTokenProvider(keyVaultClient.Object, storageConfiguration.Object, _mockLogger.Object);

            // Act
            await target.GetSasToken(org);
            string actual = await target.GetSasToken(org);

            // Assert
            Assert.Equal("ttdsecret", actual);

            keyVaultClient.Verify(s => s.GetSecretAsync(It.Is<string>(u => u == uri), It.Is<string>(i => i == secretName)), Times.Exactly(2));
        }
    }
}
