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

namespace Altinn.Platform.Authorization.IntegrationTests
{
    /// <summary>
    /// Test class for <see cref="PolicyRetrievalPoint"/>
    /// </summary>
    public class PolicyRetrievalPointTest
    {
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly Mock<IPolicyRepository> _policyRepositoryMock;
        private readonly PolicyRetrievalPoint _sut;

        public PolicyRetrievalPointTest()
        {
            _policyRepositoryMock = new Mock<IPolicyRepository>();
            _sut = new PolicyRetrievalPoint(_policyRepositoryMock.Object);

        }

        /// <summary>
        /// Test case:
        /// Expected: 
        /// </summary>
        public void Eksempelkode()
        {
            /*
            Verken WritePolicy eller GetPolicy er implementert enda, men du kan implementere testcases
            og sette opp det du har som forventet input og output, uten å kjøre testene.
            Evt. kan du jo sette opp en par tester og så prøve deg litt på implementasjon av klassene.
            Da tror jeg write policy vil være den som er enklest å starte med.

            Nedenfor har du noen eksempler på hvordan du setter opp mocken på policyRepository og bestemmer output. 
             */


            // Setter opp en policy repository mock som uavhengig av strengen den få inn som input returnerer datastream
            Moq.Mock<IPolicyRepository> policyRepositoryMock = new Mock<IPolicyRepository>();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            policyRepositoryMock.Setup(p => p.GetPolicyAsync(It.IsAny<string>())).Returns(Task.FromResult(dataStream));

            // Setter opp en policy repository mock som returnerer datastream hvis input matcher "org/app/policy.xml". Tror det er null som returneres hvis ikke. 
            Moq.Mock<IPolicyRepository> policyRepositoryMock_1 = new Mock<IPolicyRepository>();
            Stream dataStream_1 = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            policyRepositoryMock_1.Setup(p => p.GetPolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xml")))).Returns(Task.FromResult(dataStream_1));

            // Setter opp en policy repository mock som uavhengig av input kaster exception av typen argument null exception.
            Moq.Mock<IPolicyRepository> policyRepositoryMock_2 = new Mock<IPolicyRepository>();
            Stream dataStream_2 = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            policyRepositoryMock_1.Setup(p => p.GetPolicyAsync(It.IsAny<string>())).Throws(new ArgumentNullException("Value cannot be null"));

            // Setter opp en instans av prp-klassen med mocken.
            PolicyRetrievalPoint pr = new PolicyRetrievalPoint(policyRepositoryMock.Object);
        }

        /// <summary>
        /// Test case: Get existing file from storage.
        /// Expected: GetPolicyAsync returns a file that is not null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC01()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            _policyRepositoryMock.Setup(p => p.GetPolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xacml")))).ReturnsAsync(dataStream);
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp());

            // Act
            var policy = await _sut.GetPolicyAsync(request);

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
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            _policyRepositoryMock.Setup(p => p.GetPolicyAsync(It.Is<string>(s => s.Equals("org/app/policy2.xacml")))).ReturnsAsync(dataStream);
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp());

            // Act
            var policy = await _sut.GetPolicyAsync(request);

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
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            _policyRepositoryMock.Setup(p => p.GetPolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xacml")))).ReturnsAsync(dataStream);
            XacmlContextRequest request = new XacmlContextRequest(true, true, new List<XacmlContextAttributes>());

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _sut.GetPolicyAsync(request));
        }

        /// <summary>
        /// Test case: Write to storage a file that contains the necessary attributes, org and app.
        /// Expected: WritePolicyAsync returns true.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC01()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/AltinnApps/skd/taxreport/policy.xml");
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xacml")), It.IsAny<Stream>())).ReturnsAsync(true);

            // Act
            bool successfullyStored = await _sut.WritePolicyAsync("org", "app", dataStream);

            // Assert
            Assert.True(successfullyStored);
        }

        /// <summary>
        /// Test case: Write a file to storage where the org and app parameter arguments is empty.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC02()
        {
            // Arrange
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xacml")), It.IsAny<Stream>())).ReturnsAsync(true);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _sut.WritePolicyAsync("", "", new MemoryStream()));
        }

        /// <summary>
        /// Test case: Write to storage a file that is null.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC03()
        {
            // Arrange
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xacml")), It.IsAny<Stream>())).ReturnsAsync(true);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _sut.WritePolicyAsync("org", "app", null));
        }

        /// <summary>
        /// Test case: Write to storage a file that do not contain attribute info about org and app.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC04()
        {
            // Arrange
            _policyRepositoryMock.Setup(p => p.WritePolicyAsync(It.Is<string>(s => s.Equals("org/app/policy.xacml")), It.IsAny<Stream>())).ReturnsAsync(true);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _sut.WritePolicyAsync("org", "app", new MemoryStream()));
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
