using Altinn.App.Api.Controllers.Attributes;

namespace Altinn.App.Api.Extensions;

internal static class HttpContextExtensions
{
    internal static string? GetJsonSettingsName(this HttpContext context)
    {
        return context.GetEndpoint()?.Metadata.GetMetadata<JsonSettingsNameAttribute>()?.Name;
    }
}
