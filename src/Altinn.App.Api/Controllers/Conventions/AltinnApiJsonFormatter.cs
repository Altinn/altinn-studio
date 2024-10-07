using System.Text.Encodings.Web;
using System.Text.Json;
using Altinn.App.Api.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;

namespace Altinn.App.Api.Controllers.Conventions;

internal sealed class AltinnApiJsonFormatter : SystemTextJsonOutputFormatter
{
    private AltinnApiJsonFormatter(string settingsName, JsonSerializerOptions options)
        : base(options)
    {
        SettingsName = settingsName;
    }

    internal string SettingsName { get; }

    public override bool CanWriteResult(OutputFormatterCanWriteContext context)
    {
        if (context.HttpContext.GetJsonSettingsName() != SettingsName)
        {
            return false;
        }

        return base.CanWriteResult(context);
    }

    internal static AltinnApiJsonFormatter CreateFormatter(string settingsName, JsonOptions jsonOptions)
    {
        var jsonSerializerOptions = jsonOptions.JsonSerializerOptions;

        if (jsonSerializerOptions.Encoder is null)
        {
            // If the user hasn't explicitly configured the encoder, use the less strict encoder that does not encode all non-ASCII characters.
            jsonSerializerOptions = new JsonSerializerOptions(jsonSerializerOptions)
            {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            };
        }

        return new AltinnApiJsonFormatter(settingsName, jsonSerializerOptions);
    }
}
