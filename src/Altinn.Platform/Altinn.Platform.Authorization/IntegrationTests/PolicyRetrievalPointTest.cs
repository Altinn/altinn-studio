using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("Our Test Collection #1")]
    public class PolicyRetrievalPointTest : IClassFixture<PolicyRetrivevalPointFixture>
    {
        Mock<IOptions<AzureStorageConfiguration>> _storageConfigMock;
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly PolicyRetrivevalPointFixture _fixture;
        private readonly IPolicyRepository _pr;
        private readonly IPolicyRetrievalPoint _prp;

        public PolicyRetrievalPointTest(PolicyRetrivevalPointFixture fixture)
        {
            _fixture = fixture;
            _storageConfigMock = new Mock<IOptions<AzureStorageConfiguration>>();
            _storageConfigMock.Setup(s => s.Value).Returns(new AzureStorageConfiguration()
            {
                AccountName = "devstoreaccount1",
                AccountKey = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
                MetadataContainer = "metadata",
                BlobEndpoint = "http://127.0.0.1:10000/devstoreaccount1"
            });

            var services = new ServiceCollection();
            services.AddMemoryCache();
            var serviceProvider = services.BuildServiceProvider();

            var memoryCache = serviceProvider.GetService<IMemoryCache>();
            IOptions<GeneralSettings> options = Options.Create<GeneralSettings>(new GeneralSettings() { PolicyCacheTimeout = 1 });

            _pr = new PolicyRepository();
            _prp = new Services.Implementation.PolicyRetrievalPoint(_pr, memoryCache, options);
        }

        /// <summary>
        /// Test case: Get file from storage.
        /// Expected: GetPolicyAsync returns a file that is not null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC01()
        {
            // Arrange
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp());

            // Act
            XacmlPolicy xacmlPolicy = await _prp.GetPolicyAsync(request);

            // Assert
            Assert.NotNull(xacmlPolicy);
        }

        /// <summary>
        /// Test case: Get a file from storage that does not exists.
        /// Expected: GetPolicyAsync returns null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC02()
        {
            // Arrange
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp(false));

            // Act
            XacmlPolicy xacmlPolicy = await _prp.GetPolicyAsync(request);

            // Assert
            Assert.Null(xacmlPolicy);
        }

        /// <summary>
        /// Test case: Get a file from storage with a request that does not contain information about org and app. 
        /// Expected: GetPolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC03()
        {
            // Arrange
            XacmlContextRequest request = new XacmlContextRequest(true, true, new List<XacmlContextAttributes>());

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _prp.GetPolicyAsync(request));
        }

        /// <summary>
        /// Test case: Write to storage a file.
        /// Expected: WritePolicyAsync returns true.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC01()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Policies/policy.xml");

            // Act
            bool successfullyStored = await _prp.WritePolicyAsync("org", "app", dataStream);
            TestSetupUtil.DeleteAppBlobData("org", "app");

            // Assert
            Assert.True(successfullyStored);
        }

        /// <summary>
        /// Test case: Write a file to storage where the org parameter arguments is empty.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC02()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _prp.WritePolicyAsync("", "app", new MemoryStream()));
        }

        /// <summary>
        /// Test case: Write a file to storage where the app parameter arguments is empty.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC03()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _prp.WritePolicyAsync("org", "", new MemoryStream()));
        }

        /// <summary>
        /// Test case: Write to storage a file that is null.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC04()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _prp.WritePolicyAsync("org", "app", null));
        }

        private List<XacmlContextAttributes> GetXacmlContextAttributesWithOrgAndApp(bool existingApp = true)
        {
            List<XacmlContextAttributes> xacmlContexts = new List<XacmlContextAttributes>();

            XacmlContextAttributes xacmlContext = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeOrg = new XacmlAttribute(new Uri("urn:altinn:org"), true);
            xacmlAttributeOrg.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:org"), ORG));
            xacmlContext.Attributes.Add(xacmlAttributeOrg);

            xacmlContexts.Add(xacmlContext);

            XacmlContextAttributes xacmlContext2 = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeApp = new XacmlAttribute(new Uri("urn:altinn:app"), true);
            if (existingApp)
            {
                xacmlAttributeApp.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:app"), APP));
            }
            else
            {
                xacmlAttributeApp.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:app"), "dummy-app"));
            }
            xacmlContext2.Attributes.Add(xacmlAttributeApp);

            xacmlContexts.Add(xacmlContext2);

            return xacmlContexts;
        }
    }
}

