using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Altinn.Augmenter.Agent.Tests.Integration.Helpers;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            var typstPath = TypstLocator.FindTypst();
            var settings = new Dictionary<string, string?>
            {
                ["Callback:AllowedPatterns:0"] = "http://localhost:*/*",
            };

            if (typstPath != null)
            {
                settings["Typst:Path"] = typstPath;
            }

            config.AddInMemoryCollection(settings);
        });
    }
}
