using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Altinn.App.Api.Controllers.Attributes;
using Altinn.App.Api.Controllers.Conventions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Tests.Controllers.Conventions;

public class ConfigureMvcJsonOptionsTests
{
    [Fact]
    public void Configure_InsertsCustomFormatterWithCorrectSettings()
    {
        // Arrange
        var jsonSettingsName = JsonSettingNames.AltinnApi;
        ConfigureMvcJsonOptions configureOptions = GetConfigureOptionsForTest(jsonSettingsName);
        var mvcOptions = new MvcOptions();

        // Create default JsonSerializerOptions with JsonStringEnumConverter
        var defaultSerializerOptions = new JsonSerializerOptions();
        defaultSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        defaultSerializerOptions.Encoder = JavaScriptEncoder.Default;
        defaultSerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver();

        // Add the default SystemTextJsonOutputFormatter
        var defaultJsonFormatter = new SystemTextJsonOutputFormatter(defaultSerializerOptions);
        mvcOptions.OutputFormatters.Add(defaultJsonFormatter);

        // Act
        configureOptions.Configure(mvcOptions);

        // Assert
        var customFormatter = mvcOptions.OutputFormatters.OfType<AltinnApiJsonFormatter>().FirstOrDefault();

        Assert.NotNull(customFormatter);
        Assert.Equal(jsonSettingsName, customFormatter.SettingsName);

        var indexOfDefaultFormatter = mvcOptions.OutputFormatters.IndexOf(defaultJsonFormatter);
        var indexOfCustomFormatter = mvcOptions.OutputFormatters.IndexOf(customFormatter);

        Assert.Equal(indexOfDefaultFormatter - 1, indexOfCustomFormatter);

        var customSerializerOptions = customFormatter.SerializerOptions;
        var hasEnumConverter = customSerializerOptions.Converters.Any(c => c is JsonStringEnumConverter);

        Assert.False(
            hasEnumConverter,
            "JsonStringEnumConverter should have been removed from the custom formatter's SerializerOptions"
        );

        Assert.NotNull(customSerializerOptions.Encoder);
    }

    [Fact]
    public void Configure_NoDefaultOutputFormatter_ThrowsInvalidOperationException()
    {
        ConfigureMvcJsonOptions configureOptions = GetConfigureOptionsForTest(JsonSettingNames.AltinnApi);

        var mvcOptions = new MvcOptions();

        Assert.Throws<InvalidOperationException>(() => configureOptions.Configure(mvcOptions));
    }

    private static ConfigureMvcJsonOptions GetConfigureOptionsForTest(string jsonSettingsName)
    {
        var jsonOptions = new JsonOptions();
        jsonOptions.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        jsonOptions.JsonSerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver();

        var optionsMonitor = new TestOptionsMonitor<JsonOptions>(jsonOptions);
        var configureOptions = new ConfigureMvcJsonOptions(jsonSettingsName, optionsMonitor);
        return configureOptions;
    }
}

public class TestOptionsMonitor<TOptions> : IOptionsMonitor<TOptions>
{
    public TestOptionsMonitor(TOptions currentValue)
    {
        CurrentValue = currentValue;
    }

    public TOptions CurrentValue { get; }

    public TOptions Get(string? name) => CurrentValue;

    public IDisposable OnChange(Action<TOptions, string> listener)
    {
        // No-op for testing purposes
        return null!;
    }
}
