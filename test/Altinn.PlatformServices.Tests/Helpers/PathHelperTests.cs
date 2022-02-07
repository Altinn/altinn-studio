using Altinn.App.PlatformServices.Helpers;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Helpers
{
    public class PathHelperTests
    {
        [Theory]
        [InlineData("/this/is/legal/path", "/this/is/legal/path/test")]
        [InlineData("/this/is/legal/path", "/this/is/legal/path/test/test2/../../test2")]
        [InlineData("c:\\this\\is\\legal\\path", "c:\\this\\is\\legal\\path\\test")]
        public void AbsoluteLegalPathsReturnsTrueForValidPaths(string legalPath, string filePath)
        {
            Assert.True(PathHelper.ValidateLegalFilePath(legalPath, filePath));
        }

        [Theory]
        [InlineData("/this/is/legal/path", "/this/is/not/legal/path/test")]
        [InlineData("/this/is/legal/path", "/this/is/legal/path/test/../../../../test2")]
        [InlineData("c:\\this\\is\\legal\\path", "c:\\this\\is\\not\\legal\\path\\test")]
        public void AbsoluteLegalPathsReturnsFalseForInvalidPaths(string legalPath, string filePath)
        {
            Assert.False(PathHelper.ValidateLegalFilePath(legalPath, filePath));
        }

        [Theory]
        [InlineData("this/is/legal/path", "this/is/legal/path/test")]
        [InlineData("this/is/legal/path", "this/is/legal/path/test/test2/../../test2")]
        [InlineData("this\\is\\legal\\path", "this\\is\\legal\\path\\test")]
        public void RelativeLegalPathsReturnsTrueForValidPaths(string legalPath, string filePath)
        {
            Assert.True(PathHelper.ValidateLegalFilePath(legalPath, filePath));
        }

        [Theory]
        [InlineData("this/is/legal/path", "this/is/not/legal/path/test")]
        [InlineData("this/is/legal/path", "this/is/legal/path/test/../../../../test2")]
        [InlineData("this\\is\\legal\\path", "this\\is\\not\\legal\\path\\test")]
        public void RelativeLegalPathsReturnsFalseForInvalidPaths(string legalPath, string filePath)
        {
            Assert.False(PathHelper.ValidateLegalFilePath(legalPath, filePath));
        }
    }
}
