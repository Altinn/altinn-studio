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
        public void AssertFileExtensionIsOfType_InCorrectType_ShouldThrowException(string file, string incorrectExtension)
        {
            Assert.Throws<ArgumentException>(() => Guard.AssertFileExtensionIsOfType(file, incorrectExtension));
        }

        [Theory]
        [InlineData("filename.xsd", ".xsd")]
        [InlineData("path/to/filename.json", ".json")]
        [InlineData("path/to/filename.schema.json", ".json")]
        public void AssertFileExtensionIsOfType_CorrectType_ShouldNotThrowException(string file, string correctExtension)
        {
            Guard.AssertFileExtensionIsOfType(file, correctExtension);
            Assert.True(true);
        }
    }
}
