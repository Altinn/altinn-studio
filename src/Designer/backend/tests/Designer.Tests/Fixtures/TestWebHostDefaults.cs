using System;
using System.Runtime.CompilerServices;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Hosting;

namespace Designer.Tests.Fixtures;

internal static class TestWebHostDefaults
{
    private const string ReloadConfigOnChangeKey = "hostBuilder:reloadConfigOnChange";

    [ModuleInitializer]
    internal static void ConfigureProcessEnvironment()
    {
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Test");
        Environment.SetEnvironmentVariable(
            $"{nameof(DistributedCacheSettings)}__{nameof(DistributedCacheSettings.Type)}",
            DistributedCacheType.Memory.ToString()
        );
    }

    public static void Configure(IWebHostBuilder builder)
    {
        builder.UseSetting(ReloadConfigOnChangeKey, bool.FalseString);
    }
}
