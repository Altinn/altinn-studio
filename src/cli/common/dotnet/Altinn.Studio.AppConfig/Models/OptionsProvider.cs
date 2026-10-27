using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

public sealed record OptionsProvider(string Id, string RegisteredBy, SourceSpan Position);

public sealed record OptionsProviderWithUnknownId(string RegisteredBy, SourceSpan Position);
