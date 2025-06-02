using System.Runtime.CompilerServices;

namespace Altinn.App.Api.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.InitializePlugins();
        VerifierSettings.AutoVerify(includeBuildServer: false);
    }
}
