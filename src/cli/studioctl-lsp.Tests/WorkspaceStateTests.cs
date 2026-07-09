using Xunit;

namespace Altinn.Studio.AppConfigLsp.Tests;

public sealed class WorkspaceStateTests
{
    [Fact]
    public void LocalPath_PercentEncodedDriveColonUri_HasNoLeadingSeparator()
    {
        var path = WorkspaceState.LocalPath("file:///c%3A/Erling/Kode/apper/saksbehandling-konsept");

        Assert.Equal(
            OperatingSystem.IsWindows()
                ? @"c:\Erling\Kode\apper\saksbehandling-konsept"
                : "/c:/Erling/Kode/apper/saksbehandling-konsept",
            path
        );
    }

    [Fact]
    public void LocalPath_LiteralDriveColonUri_IsDrivePath()
    {
        Assert.Equal(
            @"c:\Erling\Kode\apper\saksbehandling-konsept",
            WorkspaceState.LocalPath("file:///c:/Erling/Kode/apper/saksbehandling-konsept")
        );
    }

    [Fact]
    public void LocalPath_UnixPathUri_IsUnchanged()
    {
        Assert.Equal(
            OperatingSystem.IsWindows() ? @"\home\erling\app" : "/home/erling/app",
            WorkspaceState.LocalPath("file:///home/erling/app")
        );
    }

    [Fact]
    public void LocalPath_MalformedUri_ReturnsNull()
    {
        Assert.Null(WorkspaceState.LocalPath("not a uri"));
        Assert.Null(WorkspaceState.LocalPath(""));
        Assert.Null(WorkspaceState.LocalPath(null));
    }
}
