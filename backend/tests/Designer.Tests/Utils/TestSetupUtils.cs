using System;
using System.IO;

namespace Designer.Tests.Utils;

public class TestSetupUtils
{
    // Dirty hack to make test run on Linux. We need to set the environment variable ALTINN_KEY_DIRECTORY
    public static void SetupDirtyHackIfLinux()
    {
        if (System.Environment.OSVersion.Platform == PlatformID.Unix)
        {
            Environment.SetEnvironmentVariable("DOTNET_HOST_FACTORY_RESOLVER_DEFAULT_TIMEOUT_IN_SECONDS", "600"); // 10 min
            Environment.SetEnvironmentVariable("ALTINN_KEYS_DIRECTORY", Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.ApplicationData), "ASP.NET", "DataProtection-Keys"));
        }
    }
}
