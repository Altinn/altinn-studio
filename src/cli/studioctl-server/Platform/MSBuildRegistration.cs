using Microsoft.Build.Locator;

namespace Altinn.Studio.StudioctlServer.Platform;

/// <summary>Registers a runtime-compatible SDK once for the code that evaluates MSBuild in process.</summary>
internal static class MSBuildRegistration
{
    private static readonly Lock _gate = new();

    public static void EnsureRegistered()
    {
        lock (_gate)
        {
            if (!MSBuildLocator.IsRegistered)
                MSBuildLocator.RegisterDefaults();
        }
    }
}
