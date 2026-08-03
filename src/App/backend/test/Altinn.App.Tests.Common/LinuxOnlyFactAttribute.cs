using Xunit;

namespace Altinn.App.Tests.Common;

internal sealed class LinuxOnlyFactAttribute : FactAttribute
{
    public LinuxOnlyFactAttribute()
    {
        if (!OperatingSystem.IsLinux())
        {
            Skip = "This test only runs on Linux.";
        }
    }
}
