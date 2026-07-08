using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class OverlayAppDirectoryTests
{
    private static InMemoryAppDirectory BaseDir() =>
        new(
            new()
            {
                ["a/one.json"] = "ONE-BASE",
                ["a/two.json"] = "TWO-BASE",
                ["a/b/three.json"] = "THREE-BASE",
            }
        );

    private static string ReadString(IAppDirectory dir, string path) =>
        Encoding.UTF8.GetString(dir.ReadAllBytes(path) ?? Array.Empty<byte>());

    [Fact]
    public void Set_AddsOverlayOnlyFile_VisibleThroughOverlay_NotOnBase()
    {
        var basedir = BaseDir();
        var ov = new OverlayAppDirectory(basedir);
        ov.Set("a/new.json", "NEW");

        Assert.True(ov.Exists("a/new.json"));
        Assert.Equal("NEW", ReadString(ov, "a/new.json"));
        Assert.False(basedir.Exists("a/new.json"));
    }

    [Fact]
    public void Set_ShadowsBaseFile()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Set("a/one.json", "ONE-OVERLAY");
        Assert.Equal("ONE-OVERLAY", ReadString(ov, "a/one.json"));
    }

    [Fact]
    public void Clear_RevealsBaseFileAgain()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Set("a/one.json", "ONE-OVERLAY");
        ov.Clear("a/one.json");
        Assert.Equal("ONE-BASE", ReadString(ov, "a/one.json"));
    }

    [Fact]
    public void Tombstone_HidesBaseFile_FromExistsAndRead()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Tombstone("a/one.json");
        Assert.False(ov.Exists("a/one.json"));
        Assert.Null(ov.ReadAllBytes("a/one.json"));
    }

    [Fact]
    public void Tombstone_HidesFile_FromEnumeration()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Tombstone("a/one.json");

        var listed = ov.EnumerateFiles("a", "*.json", recursive: false).ToList();
        Assert.DoesNotContain("a/one.json", listed);
        Assert.Contains("a/two.json", listed);
    }

    [Fact]
    public void SetAfterTombstone_ResurrectsThePath()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Tombstone("a/one.json");
        ov.Set("a/one.json", "REBORN");

        Assert.True(ov.Exists("a/one.json"));
        Assert.Equal("REBORN", ReadString(ov, "a/one.json"));
    }

    [Fact]
    public void TombstoneAfterSet_HidesTheOverlay()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Set("a/one.json", "OVERLAY");
        ov.Tombstone("a/one.json");
        Assert.False(ov.Exists("a/one.json"));
        Assert.Null(ov.ReadAllBytes("a/one.json"));
    }

    [Fact]
    public void OverlayOnly_Files_AppearInEnumeration()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Set("a/new.json", "NEW");

        Assert.Contains("a/new.json", ov.EnumerateFiles("a", "*.json", recursive: false));
        Assert.Contains("a/new.json", ov.EnumerateFiles("a", "*.json", recursive: true));
    }

    [Fact]
    public void OverlayOnly_File_MatchesInteriorWildcardPattern()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Set("a/resource.en.json", """{"language":"en","resources":[]}""");

        Assert.Contains("a/resource.en.json", ov.EnumerateFiles("a", "resource.*.json", recursive: false));
    }

    [Fact]
    public void EnumerateFiles_RespectsSearchPatternAndRecursion()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        var nonrec = ov.EnumerateFiles("a", "*.json", recursive: false).ToList();
        Assert.Equal(new[] { "a/one.json", "a/two.json" }.OrderBy(s => s), nonrec.OrderBy(s => s));

        var rec = ov.EnumerateFiles("a", "*.json", recursive: true).ToList();
        Assert.Contains("a/b/three.json", rec);
    }

    [Fact]
    public void DirectoryExists_IsFalse_WhenEveryFileInDirIsTombstonedAndNoOverlayAdds()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Tombstone("a/b/three.json");
        Assert.False(ov.DirectoryExists("a/b"));
    }

    [Fact]
    public void DirectoryExists_IsTrue_WhenOverlayHasFilesUnderIt()
    {
        var ov = new OverlayAppDirectory(BaseDir());
        ov.Set("brand-new-dir/file.json", "X");
        Assert.True(ov.DirectoryExists("brand-new-dir"));
    }

    [Fact]
    public void BaseChanges_LeakThroughTheOverlay_WhenNoOverlayShadowsThePath()
    {
        var basedir = BaseDir();
        var ov = new OverlayAppDirectory(basedir);
        basedir.Set("a/one.json", "CHANGED-AT-BASE");
        Assert.Equal("CHANGED-AT-BASE", ReadString(ov, "a/one.json"));
    }
}
