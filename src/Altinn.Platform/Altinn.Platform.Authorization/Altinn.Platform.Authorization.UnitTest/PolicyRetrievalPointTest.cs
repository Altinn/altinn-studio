using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Moq;
using Xunit;

namespace Altinn.Platform.Authorization.UnitTest
{
    /// <summary>
    /// Test class for <see cref="PolicyRetrievalPoint"/>
    /// </summary>
    public class PolicyRetrievalPointTest
    {
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly Mock<IPolicyRepository> _policyRepositoryMock;
        private readonly PolicyRetrievalPoint _prp;

        public PolicyRetrievalPointTest()
        {
            _policyRepositoryMock = new Mock<IPolicyRepository>();
            _prp = new PolicyRetrievalPoint(_policyRepositoryMock.Object);
        }

        /// <summary>
        /// Test case: Get existing file from storage.
        /// Expected: GetPolicyAsync returns a file that is not null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC01()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/policy.xml");
            _policyRepositoryMock.Setup(p => p.GetPolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xml")))).ReturnsAsync(dataStream);
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp());

            // Act
            var policy = await _prp.GetPolicyAsync(request);

            // Assert
            Assert.NotNull(policy);
        }

        /// <summary>
        /// Test case: Get a file from storage that does not exists.
        /// Expected: GetPolicyAsync returns null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC02()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/policy.xml");
            _policyRepositoryMock.Setup(p => p.GetPolicyAsync(It.Is<string>(s => s.Equals("org/app/policy2.xml")))).ReturnsAsync(dataStream);
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp());

            // Act
            var policy = await _prp.GetPolicyAsync(request);

            // Assert
            Assert.Null(policy);
        }

        /// <summary>
        /// Test case: Get a file from storage with a request that does not contain information about org and app. 
        /// Expected: GetPolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC03()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/policy.xml");
            _policyRepositoryMock.Setup(p => p.GetPolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xml")))).ReturnsAsync(dataStream);
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
            Stream dataStream = File.OpenRead("Data/policy.xml");
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xml")), It.IsAny<Stream>())).ReturnsAsync(true);

            // Act
            bool successfullyStored = await _prp.WritePolicyAsync("org", "app", dataStream);

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
            // Arrange
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xml")), It.IsAny<Stream>())).ReturnsAsync(true);

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
            // Arrange
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xml")), It.IsAny<Stream>())).ReturnsAsync(true);

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
            // Arrange
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xml")), It.IsAny<Stream>())).ReturnsAsync(true);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _prp.WritePolicyAsync("org", "app", null));
        }

        private List<XacmlContextAttributes> GetXacmlContextAttributesWithOrgAndApp()
        {
            List<XacmlContextAttributes> xacmlContexts = new List<XacmlContextAttributes>();

            XacmlContextAttributes xacmlContext = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeOrg = new XacmlAttribute(new Uri("urn:altinn:org"), true);
            xacmlAttributeOrg.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:org"), "org"));
            xacmlContext.Attributes.Add(xacmlAttributeOrg);

            xacmlContexts.Add(xacmlContext);

            XacmlContextAttributes xacmlContext2 = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeApp = new XacmlAttribute(new Uri("urn:altinn:app"), true);
            xacmlAttributeApp.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:app"), "app"));
            xacmlContext2.Attributes.Add(xacmlAttributeApp);

            xacmlContexts.Add(xacmlContext2);

            return xacmlContexts;
        }
    }
}
