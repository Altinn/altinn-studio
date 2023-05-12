using Altinn.Studio.Designer.Helpers.Extensions;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class Extensions
    {
        [Theory]
        [InlineData("http://studio.localhost/repos", "http://studio.localhost/repos/ttd/testrepo.git", "ttd/testrepo.git")]
        [InlineData("http://studio.localhost/repos", "http://studio.localhost/repos/first/second/third", "first", "second", "third")]
        [InlineData("http://altinn-repositories:3000", "http://altinn-repositories:3000/ttd/testrepo.git", "ttd/testrepo.git")]
        public void AppendToUri_ShouldReturnExpected(string baseUrl, string expectedOutput, params string[] paths)
        {
            var uri = new System.Uri(baseUrl);
            var result = uri.Append(paths);
            Assert.Equal(expectedOutput, result.ToString());
        }
    }
}
