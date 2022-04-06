using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Options;
using Altinn.App.PlatformServices.Options.Altinn2Provider;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Options.Altinn2Provider
{
    public class Altinn2OptionsCacheTests
    {
        public ServiceCollection GetServiceCollection()
        {
            var services = new ServiceCollection();

            services.AddMemoryCache();

            var httpClient = services.AddHttpClient<Altinn2MetadataApiClient>();

            // Registrer the instrumented fake message handler as singleton, so we can count
            // how many http calls getw through the cache.
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
                metadataApiId: "ASF_land");
            services.AddAltinn2CodeList(
                id: "ASF_Land4",
                transform: (code) => new() { Value = code.Code, Label = code.Value1 },
                codeListVersion: 2758,
                metadataApiId: "ASF_land");
            services.AddAltinn2CodeList(
                id: "ASF_Fylker",
                transform: (code) => new() { Value = code.Code, Label = code.Value1 },
                codeListVersion: 3063,
                metadataApiId: "ASF_Fylker");

            var sp = services.BuildServiceProvider(validateScopes: true);

            // Do two fetches of ASF_Land and see that only one call gets passed to the messageHandler
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                var messageHandler = scope.ServiceProvider.GetRequiredService<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
                messageHandler.CallCounter.Should().Be(0);
                providers.Count().Should().Be(3);
                var optionsProvider = providers.SingleOrDefault(p => p.Id == "ASF_Land3");
                await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                await Task.Delay(5);
                messageHandler.CallCounter.Should().Be(1);

                await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                await Task.Delay(5);
                messageHandler.CallCounter.Should().Be(1);
            }

            // Repeat the process in another scope
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                var messageHandler = scope.ServiceProvider.GetRequiredService<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
                var optionsProvider = providers.SingleOrDefault(p => p.Id == "ASF_Land3");
                await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                await Task.Delay(5);
                messageHandler.CallCounter.Should().Be(1);

                await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                await Task.Delay(5);
                messageHandler.CallCounter.Should().Be(1);
            }

            // Try another request that uses ASF_Fylker instead, and see that another call is made
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                var messageHandler = scope.ServiceProvider.GetRequiredService<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
                var optionsProvider = providers.SingleOrDefault(p => p.Id == "ASF_Fylker");
                await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                await Task.Delay(5);
                messageHandler.CallCounter.Should().Be(2);

                // Fetch the list in nynorsk and see that yeat another call is made
                await optionsProvider.GetAppOptionsAsync("nn", new Dictionary<string, string>());
                await Task.Delay(5);
                messageHandler.CallCounter.Should().Be(3);
            }
        }
    }
}
