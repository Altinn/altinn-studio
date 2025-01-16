using System;
using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class GuardTests
    {
        [Theory]
        [InlineData("filename.xsd", ".xs")]
        [InlineData("path/to/filename.json", "json")]
        [InlineData("path/to/filename.schema.json", "jsonschema")]
        public void AssertFileExtensionIsOfType_InCorrectType_ShouldThrowException(string file,
            string incorrectExtension)
        {
            Assert.Throws<ArgumentException>(() => Guard.AssertFileExtensionIsOfType(file, incorrectExtension));
        }

        [Theory]
        [InlineData("filename.xsd", ".xsd")]
        [InlineData("path/to/filename.json", ".json")]
        [InlineData("path/to/filename.schema.json", ".json")]
        public void AssertFileExtensionIsOfType_CorrectType_ShouldNotThrowException(string file,
            string correctExtension)
        {
            Guard.AssertFileExtensionIsOfType(file, correctExtension);
            Assert.True(true);
        }

        [Theory]
        [InlineData("apps-test")]
        [InlineData("endring-av-navn-v2")]
        public void AssertValidAppRepoName_ValidName_ShouldNotThrowException(string name)
        {
            Guard.AssertValidAppRepoName(name);
            Assert.True(true);
        }

        [Theory]
        [InlineData("2021-apps-test")]
        [InlineData("datamodels")]
        public void AssertValidAppRepoName_InvalidName_ShouldThrowException(string name)
        {
            Assert.Throws<ArgumentException>(() => Guard.AssertValidAppRepoName(name));
        }

        [Theory]
        [InlineData("ValidOrgName")]
        public void AssertValidateOrganization_ValidOrg_ShouldNotThrowException(string org)
        {
            Guard.AssertValidateOrganization(org);
            Assert.True(true);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("Invalid@OrgName")]
        public void AssertValidateOrganization_InvalidOrg_ShouldThrowException(string org)
        {
            Assert.Throws<ArgumentException>(() => Guard.AssertValidateOrganization(org));
        }
    }
}
