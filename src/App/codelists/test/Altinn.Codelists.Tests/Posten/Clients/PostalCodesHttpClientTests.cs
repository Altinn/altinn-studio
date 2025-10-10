using Altinn.Codelists.Posten;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Tests.Posten.Clients;

public class PostalCodesHttpClientTests
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
        services.AddPostenClient();
        services.Configure<PostenSettings>(s => s.Url = uri.ToString());
        await using var serviceProvider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateOnBuild = true, ValidateScopes = true }
        );

        var client = serviceProvider.GetRequiredService<IPostalCodesClient>();

        var postalCodes = await client.GetPostalCodes();

        await Verify(postalCodes);
    }
}
