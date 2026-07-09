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
}
