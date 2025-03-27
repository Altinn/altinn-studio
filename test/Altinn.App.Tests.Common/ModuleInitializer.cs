using System.Runtime.CompilerServices;

namespace Altinn.App.Tests.Common;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.AutoVerify(includeBuildServer: false);
    }
}
