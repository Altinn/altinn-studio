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
            if (typstPath != null)
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Typst:Path"] = typstPath,
                });
            }
        });
    }
}
