using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.Options.Altinn2Provider;
using Altinn.App.Core.Internal.Language;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Options.Altinn2Provider;

public class Altinn2OptionsCacheTests
{
    public static ServiceCollection GetServiceCollection()
    {
        var services = new ServiceCollection();

        services.AddMemoryCache();

        var httpClient = services.AddHttpClient<Altinn2MetadataApiClient>();

        // Registrer the instrumented fake message handler as singleton, so we can count
        // how many http calls gets through the cache.
        services.AddSingleton<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
        httpClient.ConfigurePrimaryHttpMessageHandler<Altinn2MetadataApiClientHttpMessageHandlerMoq>();

        return services;
    }

    [Fact]
    public async Task Altinn2OptionsTests_TestCache()
    {
        var services = GetServiceCollection();
        services.AddAltinn2CodeList(
            id: "ASF_Land3",
            transform: (code) => new() { Value = code.Code, Label = code.Value1 },
            codeListVersion: 2758,
            metadataApiId: "ASF_land"
        );
        services.AddAltinn2CodeList(
            id: "ASF_Land4",
            transform: (code) => new() { Value = code.Code, Label = code.Value1 },
            codeListVersion: 2758,
            metadataApiId: "ASF_land"
        );
        services.AddAltinn2CodeList(
            id: "ASF_Fylker",
            transform: (code) => new() { Value = code.Code, Label = code.Value1 },
            codeListVersion: 3063,
            metadataApiId: "ASF_Fylker"
        );

        var sp = services.BuildStrictServiceProvider();

        // Do two fetches of ASF_Land and see that only one call gets passed to the messageHandler
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            var messageHandler =
                scope.ServiceProvider.GetRequiredService<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
            messageHandler.CallCounter.Should().Be(0);
            providers.Count().Should().Be(3);
            var optionsProvider = providers.Single(p => p.Id == "ASF_Land3");
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());
            await Task.Delay(5);
            messageHandler.CallCounter.Should().Be(1);

            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());
            await Task.Delay(5);
            messageHandler.CallCounter.Should().Be(1);
        }

        // Repeat the process in another scope
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            var messageHandler =
                scope.ServiceProvider.GetRequiredService<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
            var optionsProvider = providers.Single(p => p.Id == "ASF_Land3");
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());
            await Task.Delay(5);
            messageHandler.CallCounter.Should().Be(1);

            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());
            await Task.Delay(5);
            messageHandler.CallCounter.Should().Be(1);
        }

        // Try another request that uses ASF_Fylker instead, and see that another call is made
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            var messageHandler =
                scope.ServiceProvider.GetRequiredService<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
            var optionsProvider = providers.Single(p => p.Id == "ASF_Fylker");
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nb, new Dictionary<string, string>());
            await Task.Delay(5);
            messageHandler.CallCounter.Should().Be(2);

            // Fetch the list in nynorsk and see that yeat another call is made
            await optionsProvider.GetAppOptionsAsync(LanguageConst.Nn, new Dictionary<string, string>());
            await Task.Delay(5);
            messageHandler.CallCounter.Should().Be(3);
        }
    }
}
