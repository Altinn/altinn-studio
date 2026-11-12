using Altinn.Studio.Common.App;
using Xunit;

namespace Altinn.Studio.Common.Tests.App;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class AppFilePathTests
{
    [Theory]
    [InlineData("App/App.csproj", "App.csproj", "App")]
    [InlineData("README.md", "README.md", "")]
    [InlineData("a/b/..c", "..c", "a/b")]
    [InlineData("a/.env", ".env", "a")]
    [InlineData("", null, null)]
    [InlineData("/etc/passwd", null, null)]
    [InlineData("a/", null, null)]
    [InlineData("a//b", null, null)]
    [InlineData("a/../b", null, null)]
    [InlineData("..", null, null)]
    [InlineData("./a", null, null)]
    [InlineData("a\\b", null, null)]
    [InlineData("a\0b", null, null)]
    [InlineData("C:/Windows/file.txt", null, null)]
    [InlineData("C:file.txt", null, null)]
    [InlineData("a/file.txt:stream", null, null)]
    public void TryCreatePath_StaysInsideTheApp(string value, string? fileName, string? directory)
    {
        Assert.Equal(fileName is not null, TestAppSource.TryPath(value, out AppFilePath? path));
        Assert.Equal(fileName, path?.FileName);
        Assert.Equal(directory, path?.Directory);
    }
}
