using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers.Conventions;

/// <summary>
/// Configures MVC options to use a specific JSON serialization settings for enum-to-number conversion.
/// </summary>
public class ConfigureMvcJsonOptions : IConfigureOptions<MvcOptions>
{
    private readonly string _jsonSettingsName;
    private readonly IOptionsMonitor<JsonOptions> _jsonOptions;

    /// <summary>
    /// Initializes a new instance of the <see cref="ConfigureMvcJsonOptions"/> class.
    /// </summary>
    /// <param name="jsonSettingsName">The name of the JSON settings to be used for enum-to-number conversion.</param>
    /// /// <param name="jsonOptions">An <see cref="IOptionsMonitor{TOptions}"/> to access the named JSON options.</param>
    public ConfigureMvcJsonOptions(string jsonSettingsName, IOptionsMonitor<JsonOptions> jsonOptions)
    {
        _jsonSettingsName = jsonSettingsName;
        _jsonOptions = jsonOptions;
    }

    /// <summary>
    /// Configures the MVC options to use the <see cref="AltinnApiJsonFormatter"/> for the specified JSON settings.
    /// Makes sure to add to the formatter before the default <see cref="SystemTextJsonOutputFormatter"/> .
    /// </summary>
    /// <param name="options">The <see cref="MvcOptions"/> to configure.</param>
    public void Configure(MvcOptions options)
    {
        var defaultJsonFormatter =
            options.OutputFormatters.OfType<SystemTextJsonOutputFormatter>().FirstOrDefault()
            ?? throw new InvalidOperationException("Could not find the default JSON output formatter");

        var indexOfDefaultJsonFormatter = options.OutputFormatters.IndexOf(defaultJsonFormatter);

        var jsonOptions = _jsonOptions.Get(_jsonSettingsName);
        options.OutputFormatters.Insert(
            indexOfDefaultJsonFormatter,
            AltinnApiJsonFormatter.CreateFormatter(_jsonSettingsName, jsonOptions)
        );
    }
}
