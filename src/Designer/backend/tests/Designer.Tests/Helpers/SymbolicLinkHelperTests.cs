using System;
using System.IO;
using Altinn.Studio.Designer.Helpers;
using Designer.Tests.TestAttributes;
using Xunit;

namespace Designer.Tests.Helpers;

public sealed class SymbolicLinkHelperTests : IDisposable
{
    private readonly string _parentDirectory = Directory.CreateTempSubdirectory().FullName;

    [Fact]
    public void PassesThroughLink_RegularPathsAndParentDirectory_ReturnsFalse()
    {
        Directory.CreateDirectory(Path.Join(_parentDirectory, "App", "models"));
        File.WriteAllText(Path.Join(_parentDirectory, "App", "models", "model.json"), "{}");

        Assert.False(SymbolicLinkHelper.PassesThroughLink(_parentDirectory, _parentDirectory));
        Assert.False(SymbolicLinkHelper.PassesThroughLink(_parentDirectory, Path.Join(_parentDirectory, "App")));
        Assert.False(
            SymbolicLinkHelper.PassesThroughLink(
                _parentDirectory,
                Path.Join(_parentDirectory, "App", "models", "model.json")
            )
        );
        Assert.False(
            SymbolicLinkHelper.PassesThroughLink(_parentDirectory, Path.Join(_parentDirectory, "missing", "file.json"))
        );
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void PassesThroughLink_DanglingLink_ReturnsTrue()
    {
        File.CreateSymbolicLink(Path.Join(_parentDirectory, "dangling"), Path.Join(_parentDirectory, "missing"));

        Assert.True(SymbolicLinkHelper.PassesThroughLink(_parentDirectory, Path.Join(_parentDirectory, "dangling")));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void PassesThroughLink_LinkWithinParentDirectory_ReturnsTrue()
    {
        Directory.CreateDirectory(Path.Join(_parentDirectory, "App"));
        Directory.CreateSymbolicLink(Path.Join(_parentDirectory, "linked-app"), Path.Join(_parentDirectory, "App"));

        Assert.True(
            SymbolicLinkHelper.PassesThroughLink(
                _parentDirectory,
                Path.Join(_parentDirectory, "linked-app", "file.json")
            )
        );
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void PassesThroughLink_LinkAboveParentDirectory_IsNotChecked()
    {
        string linkedParentDirectory = Path.Join(_parentDirectory, "linked-parent");
        Directory.CreateDirectory(Path.Join(_parentDirectory, "parent"));
        Directory.CreateSymbolicLink(linkedParentDirectory, Path.Join(_parentDirectory, "parent"));

        Assert.False(
            SymbolicLinkHelper.PassesThroughLink(linkedParentDirectory, Path.Join(linkedParentDirectory, "file.json"))
        );
    }

    [Theory]
    [InlineData("..")]
    [InlineData("../sibling")]
    public void PassesThroughLink_PathOutsideParentDirectory_ThrowsArgumentException(string relativePath)
    {
        Assert.Throws<ArgumentException>(() =>
            SymbolicLinkHelper.PassesThroughLink(_parentDirectory, Path.Join(_parentDirectory, relativePath))
        );
    }

    public void Dispose()
    {
        Directory.Delete(_parentDirectory, recursive: true);
    }
}
