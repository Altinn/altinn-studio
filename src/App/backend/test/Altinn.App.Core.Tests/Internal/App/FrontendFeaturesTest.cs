using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Microsoft.Extensions.Configuration;

namespace Altinn.App.Core.Tests.Internal.App;

public class FrontendFeaturesTest
{
    private static IConfigurationRoot Configuration(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>(v.Key, v.Value)))
            .Build();

    [Fact]
    public void The_flags_are_read_with_camel_case_names()
    {
        var frontendFeatures = new FrontendFeatures(
            Configuration(
                ("FeatureManagement:JsonObjectInDataResponse", "true"),
                ("FeatureManagement:BetaPDFenabled", "true"),
                ("FeatureManagement:SimpleTableEnabled", "false")
            )
        );

        Assert.Equal(
            new Dictionary<string, bool>
            {
                ["jsonObjectInDataResponse"] = true,
                ["betaPDFenabled"] = true,
                ["simpleTableEnabled"] = false,
            },
            frontendFeatures.GetDictionary()
        );
    }

    [Fact]
    public async Task An_implementation_that_only_provides_the_dictionary_gets_the_rest_from_the_interface()
    {
        IFrontendFeatures frontendFeatures = new DictionaryOnlyFeatures(
            new Dictionary<string, bool> { ["jsonObjectInDataResponse"] = true }
        );

        Assert.True(frontendFeatures.IsEnabled(FeatureFlags.JsonObjectInDataResponse));
        Assert.False(frontendFeatures.IsEnabled(FeatureFlags.SimpleTableEnabled));
#pragma warning disable CS0618 // The obsolete method must keep working
        var copy = await frontendFeatures.GetFrontendFeatures();
#pragma warning restore CS0618
        Assert.Equal(frontendFeatures.GetDictionary(), copy);
        copy["jsonObjectInDataResponse"] = false;
        Assert.True(frontendFeatures.IsEnabled(FeatureFlags.JsonObjectInDataResponse));
    }

    private sealed class DictionaryOnlyFeatures(Dictionary<string, bool> flags) : IFrontendFeatures
    {
        public IReadOnlyDictionary<string, bool> GetDictionary() => flags;
    }

    [Fact]
    public void IsEnabled_looks_a_flag_up_by_its_configured_name_and_treats_unknown_flags_as_disabled()
    {
        IFrontendFeatures frontendFeatures = new FrontendFeatures(
            Configuration(("FeatureManagement:JsonObjectInDataResponse", "true"))
        );

        Assert.True(frontendFeatures.IsEnabled(FeatureFlags.JsonObjectInDataResponse));
        Assert.False(frontendFeatures.IsEnabled(FeatureFlags.SimpleTableEnabled));
    }

    [Fact]
    public void An_app_without_the_section_has_no_flags()
    {
        var frontendFeatures = new FrontendFeatures(Configuration());

        Assert.Empty(frontendFeatures.GetDictionary());
    }

    [Fact]
    public void A_flag_that_is_not_a_boolean_is_rejected()
    {
        var exception = Assert.Throws<ApplicationConfigException>(() =>
            new FrontendFeatures(Configuration(("FeatureManagement:BetaPDFenabled:EnabledFor:0:Name", "AlwaysOn")))
        );

        Assert.Contains("FeatureManagement:BetaPDFenabled", exception.Message);
    }

    [Fact]
    public void The_flags_follow_the_configuration_when_it_reloads()
    {
        var configuration = Configuration(("FeatureManagement:BetaPDFenabled", "false"));
        var frontendFeatures = new FrontendFeatures(configuration);
        Assert.False(frontendFeatures.IsEnabled("BetaPDFenabled"));

        configuration["FeatureManagement:BetaPDFenabled"] = "true";
        configuration.Reload();

        Assert.True(frontendFeatures.IsEnabled("BetaPDFenabled"));
    }
}
