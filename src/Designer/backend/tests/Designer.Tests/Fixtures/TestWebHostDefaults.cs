using Microsoft.AspNetCore.Hosting;

namespace Designer.Tests.Fixtures;

internal static class TestWebHostDefaults
{
    private const string ReloadConfigOnChangeKey = "hostBuilder:reloadConfigOnChange";

    public static void Configure(IWebHostBuilder builder)
    {
        builder.UseSetting(ReloadConfigOnChangeKey, bool.FalseString);
    }
}
