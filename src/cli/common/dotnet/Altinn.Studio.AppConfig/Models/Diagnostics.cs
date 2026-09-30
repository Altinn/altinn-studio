using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

public sealed record ParserNote(string Kind, string Detail, SourceSpan Position);

public sealed record DeprecatedConfig(string Kind, string Detail, SourceSpan Position);

public sealed record ParseError(string File, string Message, SourceSpan Position);

public sealed record DuplicateJsonKey(string Name, SourceSpan Position, SourceSpan LastPosition);

public sealed record UnsupportedAppVersion(string Reason, SourceSpan Position);
