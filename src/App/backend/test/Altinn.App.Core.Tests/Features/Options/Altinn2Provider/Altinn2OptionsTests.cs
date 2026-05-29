using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.Language;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Options.Altinn2Provider;

public class Altinn2OptionsTests
{
    [Fact]
    public void Altinn2OptionsTests_NoCustomOptionsProvider_NotReturnProviders()
    {
        var services = new ServiceCollection();

        // no custom api registrerd here
        var sp = services.BuildStrictServiceProvider();
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            providers.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task Altinn2OptionsTests_MoreThan4AndNorwayIncluded()
    {
        var services = new ServiceCollection();
        services.AddAltinn2CodeList(
            id: "ASF_Land1",
            transform: (code) => new() { Value = code.Code, Label = code.Value1 },
            codeListVersion: 2758,
            metadataApiId: "ASF_land"
        );

        var sp = services.BuildStrictServiceProvider();
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            providers.Count().Should().Be(1);
            var optionsProvider = providers.Single(p => p.Id == "ASF_Land1");
            var landOptions = await optionsProvider.GetAppOptionsAsync(
                LanguageConst.Nb,
                new Dictionary<string, string>()
            );
            landOptions.Options.Should().HaveCountGreaterThan(4, "ASF_Land needs to have more than 4 countries");
            landOptions.Options.Should().Match(options => options.Any(o => o.Value == "NORGE"));
        }
    }

    [Fact]
    public async Task Altinn2OptionsTests_EnglishLanguage()
    {
        var services = new ServiceCollection();
        services.AddAltinn2CodeList(
            id: "ASF_Land1",
            transform: (code) => new() { Value = code.Code, Label = code.Value1 },
            codeListVersion: 2758,
            metadataApiId: "ASF_land"
        );

        var sp = services.BuildStrictServiceProvider();
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            providers.Count().Should().Be(1);
            var optionsProvider = providers.Single(p => p.Id == "ASF_Land1");
            var landOptions = await optionsProvider.GetAppOptionsAsync(
                LanguageConst.En,
                new Dictionary<string, string>()
            );
            landOptions.Options.Should().HaveCountGreaterThan(4, "ASF_Land needs to have more than 4 countries");
            landOptions.Options.Should().Match(options => options.Any(o => o.Label == "NORWAY"));
        }
    }

    [Fact]
    public async Task Altinn2OptionsTests_FilterOnlyNorway()
    {
        var services = new ServiceCollection();
        services.AddAltinn2CodeList(
            id: "OnlyNorway",
            transform: (code) => new() { Value = code.Code, Label = code.Value1 },
            filter: (code) => code.Value2 == "NO",
            codeListVersion: 2758,
            metadataApiId: "ASF_land"
        );

        var sp = services.BuildStrictServiceProvider();
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            providers.Count().Should().Be(1);
            var optionsProvider = providers.Single(p => p.Id == "OnlyNorway");
            var landOptions = await optionsProvider.GetAppOptionsAsync(
                LanguageConst.Nb,
                new Dictionary<string, string>()
            );
            landOptions.Options.Should().HaveCount(1, "We filter out only norway");
            landOptions.Options.Should().Match(options => options.Any(o => o.Value == "NORGE"));
        }
    }

    [Fact]
    public async Task Altinn2OptionsTests_NoCodeListVersionProvided()
    {
        var services = new ServiceCollection();
        services.AddAltinn2CodeList(
            id: "OnlyNorway",
            transform: (code) => new() { Value = code.Code, Label = code.Value1 },
            filter: (code) => code.Value2 == "NO",
            codeListVersion: null,
            metadataApiId: "ASF_land"
        );

        var sp = services.BuildStrictServiceProvider();
        using (var scope = sp.CreateScope())
        {
            var providers = scope.ServiceProvider.GetRequiredService<IEnumerable<IAppOptionsProvider>>();
            providers.Count().Should().Be(1);
            var optionsProvider = providers.Single(p => p.Id == "OnlyNorway");
            var landOptions = await optionsProvider.GetAppOptionsAsync(
                LanguageConst.Nb,
                new Dictionary<string, string>()
            );
            landOptions.Options.Should().HaveCount(1, "We filter out only norway");
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
            codeListVersion: 4477,
            metadataApiId: "ASF_land"
        );
    }
}
