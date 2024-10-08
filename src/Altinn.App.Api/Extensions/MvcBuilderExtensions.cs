using Altinn.App.Api.Controllers.Conventions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Extensions;

internal static class MvcBuilderExtensions
{
    internal static IMvcBuilder AddJsonOptions(
        this IMvcBuilder builder,
        string settingsName,
        Action<JsonOptions> configure
    )
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(configure);

        builder.Services.Configure(settingsName, configure);

        builder.Services.AddSingleton<IConfigureOptions<MvcOptions>>(sp =>
        {
            var options = sp.GetRequiredService<IOptionsMonitor<JsonOptions>>();
            return new ConfigureMvcJsonOptions(settingsName, options);
        });

        return builder;
    }
}
