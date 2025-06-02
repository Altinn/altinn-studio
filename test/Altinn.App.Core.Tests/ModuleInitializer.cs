using System.Runtime.CompilerServices;

namespace Altinn.App.Core.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.InitializePlugins();
        VerifierSettings.AutoVerify(includeBuildServer: false);
    }
}
