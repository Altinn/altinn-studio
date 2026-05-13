using Microsoft.Build.Locator;

namespace Altinn.Analysis;

internal static class MSBuildRegistration
{
    private static readonly Lock RegistrationLock = new();

    public static void EnsureRegistered()
    {
        if (MSBuildLocator.IsRegistered)
            return;

        lock (RegistrationLock)
        {
            if (!MSBuildLocator.IsRegistered)
                MSBuildLocator.RegisterDefaults();
        }
    }
}
