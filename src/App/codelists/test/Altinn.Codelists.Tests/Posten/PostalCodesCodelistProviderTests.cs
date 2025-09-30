using Altinn.App.Core.Features;
using Altinn.Codelists.Posten;
using Altinn.Codelists.Tests.Posten.Clients;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Tests.Posten;

public class PostalCodesCodelistProviderTests
{
    [Fact]
    public async Task Get()
    {
        await using var fixture = await PostenFixture.Create(proxy: false);
        var server = fixture.Server;
        var baseUrl = server.Url;
        Assert.NotNull(baseUrl);
        var baseUri = new Uri(baseUrl);
        var uri = new Uri(baseUri, PostenSettings.DefaultPath);

        var services = new ServiceCollection();
        services.AddPosten();
        services.Configure<PostenSettings>(s => s.Url = uri.ToString());
        await using var serviceProvider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateOnBuild = true, ValidateScopes = true }
        );

        var client = serviceProvider.GetRequiredService<IPostalCodesClient>();
        var optionsProvider = serviceProvider.GetRequiredService<IAppOptionsProvider>();

        var postalCodes = await client.GetPostalCodes();
        var options = await optionsProvider.GetAppOptionsAsync(null, []);

        var clientCodes = postalCodes.Select(p => p.PostCode).ToHashSet();
        Assert.NotNull(options.Options);
        var optionsCodes = options
            .Options.Select(o =>
            {
                Assert.NotNull(o.Value);
                return o.Value;
            })
            .ToHashSet();

        Assert.True(clientCodes.SetEquals(optionsCodes));
    }
}
