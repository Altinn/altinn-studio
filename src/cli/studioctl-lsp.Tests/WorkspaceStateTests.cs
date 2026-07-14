using Xunit;

namespace Altinn.Studio.AppConfigLsp.Tests;

public sealed class WorkspaceStateTests
{
    private static string? NormalizedLocalPath(string? uri) => WorkspaceState.LocalPath(uri)?.Replace('\\', '/');

    [Fact]
    public void LocalPath_PercentEncodedDriveColonUri_HasNoLeadingSeparator()
    {
        Assert.Equal(
            OperatingSystem.IsWindows()
                ? "c:/Erling/Kode/apper/saksbehandling-konsept"
                : "/c:/Erling/Kode/apper/saksbehandling-konsept",
            NormalizedLocalPath("file:///c%3A/Erling/Kode/apper/saksbehandling-konsept")
        );
    }

    [Fact]
    public void LocalPath_LiteralDriveColonUri_IsDrivePath()
    {
        Assert.Equal(
            "c:/Erling/Kode/apper/saksbehandling-konsept",
            NormalizedLocalPath("file:///c:/Erling/Kode/apper/saksbehandling-konsept")
        );
    }

    [Fact]
    public void LocalPath_UnixPathUri_IsUnchanged()
    {
        Assert.Equal("/home/erling/app", NormalizedLocalPath("file:///home/erling/app"));
    }

    [Fact]
    public void LocalPath_MalformedUri_ReturnsNull()
    {
        Assert.Null(WorkspaceState.LocalPath("not a uri"));
        Assert.Null(WorkspaceState.LocalPath(""));
        Assert.Null(WorkspaceState.LocalPath(null));
    }

    private static WorkspaceState Workspace(string root)
    {
        var log = new Logger(LogLevel.Error);
        var workspace = new WorkspaceState(new LspTransport(Stream.Null, Stream.Null, log), log);
        workspace.SetRoot(root);
        return workspace;
    }

    [Fact]
    public void Relativize_LeadingDotDotFileName_IsInsideWorkspace()
    {
        var root = Path.Combine(Path.GetTempPath(), "ws-root");
        Assert.Equal("..settings.json", Workspace(root).Relativize(Path.Combine(root, "..settings.json")));
    }

    [Fact]
    public void Relativize_PathOutsideRoot_IsRejected()
    {
        var root = Path.Combine(Path.GetTempPath(), "ws-root");
        Assert.Null(Workspace(root).Relativize(Path.Combine(Path.GetTempPath(), "elsewhere", "file.json")));
        Assert.Null(Workspace(root).Relativize(Path.GetTempPath()));
    }

    [Fact]
    public void Relativize_RootedRelativeResult_IsRejected()
    {
        if (!OperatingSystem.IsWindows())
            return;
        Assert.Null(Workspace(@"C:\ws-root").Relativize(@"D:\other\file.json"));
    }
}
