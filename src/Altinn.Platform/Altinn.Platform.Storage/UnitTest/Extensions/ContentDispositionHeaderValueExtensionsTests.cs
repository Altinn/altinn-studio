using Altinn.Platform.Storage.Extensions;

using Microsoft.Net.Http.Headers;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.Extensions
{
    public class ContentDispositionHeaderValueExtensionsTests
    {
        [Theory]
        [InlineData("attachment; filename = test.pdf", "test.pdf")]
        [InlineData("attachment; filename = \"test.pdf\"", "test.pdf")]
        [InlineData("attachment; filename=test.pdf;", "test.pdf")]
        [InlineData("attachment;filename=test.pdf;filename*=UTF-8''other.pdf", "other.pdf")]
        [InlineData("attachment;filename=\"test.pdf\";filename*=UTF-8''other.pdf", "other.pdf")]
        public void GetFilename_ReturnsCorrectFilename(
            string rawContentDisposition,
            string expectedFilename)
        {
            // Arrange
            ContentDispositionHeaderValue contentDisposition =
                ContentDispositionHeaderValue.Parse(rawContentDisposition);

            // Act
            string actualFilename = contentDisposition.GetFilename();

            // Assert
            Assert.Equal(expectedFilename, actualFilename);
        }
    }
}
