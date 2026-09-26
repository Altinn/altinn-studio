using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Internal.App;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Extensions;

public sealed class ApplicationIdentifierRegistrationTests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppIdentifier-");

    public void Dispose() => _appDir.Delete(recursive: true);

    /// <summary>
    /// An external api client that needs the app's identity, as one that builds urls from it would.
    /// </summary>
    private sealed class ClientWithAppIdentifier(AppIdentifier appIdentifier) : IExternalApiClient
    {
        public string Id => $"client-of-{appIdentifier.App}";

        public Task<object?> GetExternalApiDataAsync(
            InstanceIdentifier instanceIdentifier,
            Dictionary<string, string> queryParams
        ) => Task.FromResult<object?>(null);
    }

    [Fact]
    public async Task The_identifier_comes_from_the_file_so_a_client_that_injects_it_does_not_recurse()
    {
        TestAppFiles.WriteMinimalApplicationMetadata(_appDir.FullName);
        var services = new ServiceCollection();
        services.AddSingleton(TestAppFiles.Load(_appDir.FullName));
        services.AddSingleton<IFrontendFeatures>(new FrontendFeatures(new ConfigurationBuilder().Build()));
        services.AddSingleton<IAppMetadata, AppMetadata>();
        services.AddAppImplementationFactory();
        services.AddTransient<IExternalApiFactory, ExternalApiFactory>();
        services.AddTransient<IExternalApiClient, ClientWithAppIdentifier>();
        Core.Extensions.ServiceCollectionExtensions.AddApplicationIdentifier(services);
        await using var provider = services.BuildServiceProvider();

        // Resolving the enriched metadata constructs the client, which resolves the identifier, which must not
        // come back through the metadata
        var metadata = provider.GetRequiredService<IAppMetadata>().ApplicationMetadata;

        Assert.Equal("app", provider.GetRequiredService<AppIdentifier>().App);
        Assert.Equal(["client-of-app"], metadata.ExternalApiIds ?? []);
    }
}
