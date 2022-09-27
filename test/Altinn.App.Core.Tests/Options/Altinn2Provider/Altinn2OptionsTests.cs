using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.Options.Altinn2Provider;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Options.Altinn2Provider
{
    public class Altinn2OptionsTests
    {
        /// <summary>
        /// Change this to false to test with real https://www.altinn.no/api/metadata/codelists instead of
        /// the moq in <see cref="Altinn.App.PlatformServices.Tests.Options.Altinn2Provider.Altinn2MetadataApiClientHttpMessageHandlerMoq"/>
        /// </summary>
        private readonly bool _shouldMoqAltinn2Api = true;

        public ServiceCollection GetServiceCollection()
        {
            var services = new ServiceCollection();

            services.AddMemoryCache();

            var httpClient = services.AddHttpClient<Altinn2MetadataApiClient>();

            if (_shouldMoqAltinn2Api)
            {
                services.AddTransient<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
                httpClient.ConfigurePrimaryHttpMessageHandler<Altinn2MetadataApiClientHttpMessageHandlerMoq>();
            }

            return services;
        }

        [Fact]
        public void Altinn2OptionsTests_NoCustomOptionsProvider_NotReturnProviders()
        {
            var services = GetServiceCollection();

            // no custom api registrerd here
            var sp = services.BuildServiceProvider(validateScopes: true);
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                providers.Count().Should().Be(0);
            }
        }

        [Fact]
        public async Task Altinn2OptionsTests_MoreThan4AndNorwayIncluded()
        {
            var services = GetServiceCollection();
            services.AddAltinn2CodeList(
                id: "ASF_Land1",
                transform: (code) => new() { Value = code.Code, Label = code.Value1 },
                codeListVersion: 2758,
                metadataApiId: "ASF_land");

            var sp = services.BuildServiceProvider(validateScopes: true);
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                providers.Count().Should().Be(1);
                var optionsProvider = providers.SingleOrDefault(p => p.Id == "ASF_Land1");
                var landOptions = await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                landOptions.Options.Count.Should().BeGreaterThan(4, "ASF_Land needs to have more than 4 countries");
                landOptions.Options.Should().Match(options => options.Any(o => o.Value == "NORGE"));
            }
        }

        [Fact]
        public async Task Altinn2OptionsTests_EnglishLanguage()
        {
            var services = GetServiceCollection();
            services.AddAltinn2CodeList(
                id: "ASF_Land1",
                transform: (code) => new() { Value = code.Code, Label = code.Value1 },
                codeListVersion: 2758,
                metadataApiId: "ASF_land");

            var sp = services.BuildServiceProvider(validateScopes: true);
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                providers.Count().Should().Be(1);
                var optionsProvider = providers.SingleOrDefault(p => p.Id == "ASF_Land1");
                var landOptions = await optionsProvider.GetAppOptionsAsync("en", new Dictionary<string, string>());
                landOptions.Options.Count.Should().BeGreaterThan(4, "ASF_Land needs to have more than 4 countries");
                landOptions.Options.Should().Match(options => options.Any(o => o.Label == "NORWAY"));
            }
        }

        [Fact]
        public async Task Altinn2OptionsTests_FilterOnlyNorway()
        {
            var services = GetServiceCollection();
            services.AddAltinn2CodeList(
                id: "OnlyNorway",
                transform: (code) => new() { Value = code.Code, Label = code.Value1 },
                filter: (code) => code.Value2 == "NO",
                codeListVersion: 2758,
                metadataApiId: "ASF_land");

            var sp = services.BuildServiceProvider(validateScopes: true);
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                providers.Count().Should().Be(1);
                var optionsProvider = providers.SingleOrDefault(p => p.Id == "OnlyNorway");
                var landOptions = await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                landOptions.Options.Count().Should().Be(1, "We filter out only norway");
                landOptions.Options.Should().Match(options => options.Any(o => o.Value == "NORGE"));
            }
        }

        [Fact]
        public async Task Altinn2OptionsTests_NoCodeListVersionProvided()
        {
            var services = GetServiceCollection();
            services.AddAltinn2CodeList(
                id: "OnlyNorway",
                transform: (code) => new() { Value = code.Code, Label = code.Value1 },
                filter: (code) => code.Value2 == "NO",
                codeListVersion: null,
                metadataApiId: "ASF_land");

            var sp = services.BuildServiceProvider(validateScopes: true);
            using (var scope = sp.CreateScope())
            {
                var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
                providers.Count().Should().Be(1);
                var optionsProvider = providers.SingleOrDefault(p => p.Id == "OnlyNorway");
                var landOptions = await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());
                landOptions.Options.Count().Should().Be(1, "We filter out only norway");
                landOptions.Options.Should().Match(options => options.Any(o => o.Value == "NORGE"));
            }
        }

        [Fact]
        public void Altinn2OptionsTests_Altinn2MetadataClientNotRegistered()
        {
            var services = new ServiceCollection();
            
            services.AddAltinn2CodeList(
                id: "OnlyNorway",
                transform: (code) => new() { Value = code.Code, Label = code.Value1 },
                filter: (code) => code.Value2 == "NO",
                codeListVersion: 2758,
                metadataApiId: "ASF_land");

            services.Should().Contain(serviceDescriptor => serviceDescriptor.ServiceType == typeof(Altinn2MetadataApiClient));
        }
    }
}
