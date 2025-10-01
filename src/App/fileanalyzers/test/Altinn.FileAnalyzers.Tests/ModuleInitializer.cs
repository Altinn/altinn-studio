using System.Runtime.CompilerServices;

namespace Altinn.Codelists.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Initialize()
    {
        VerifierSettings.AutoVerify(includeBuildServer: false);
    }
}
