using Altinn.App.Analyzers.Utils;
using Altinn.Studio.MaskinportenRules;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Configuration;

/// <summary>
/// Parses an <c>appsettings*.json</c> file and reports a <c>MaskinportenSettings</c> section that
/// collides with the one the platform provisions at deploy time (see
/// <see cref="Diagnostics.Configuration"/> and <see cref="MaskinportenInvariants"/>).
/// </summary>
internal static class MaskinportenCollisionUtils
{
    /// <summary>
    /// Inspects the given appsettings file and appends a diagnostic for each collision found.
    /// Findings in <c>appsettings.Development.json</c> are downgraded to
    /// <see cref="DiagnosticSeverity.Info"/>: deployed environments never load that file, so
    /// credentials there are a local concern rather than a deployment break.
    /// </summary>
    internal static void CollectCollisionDiagnostics(
        AdditionalText text,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        string? textContent = text.GetText(token)?.ToString();
        if (textContent is null)
        {
            return;
        }

        var localOnly = MaskinportenInvariants.IsDevelopmentSettingsFileName(GetFileName(text.Path));

        try
        {
            // .NET configuration permits comments in appsettings.json; NanoJsonReader does not.
            var root = JsonValue.Parse(JsonCommentStripper.StripComments(textContent));
            if (root.Type != JsonType.Object)
            {
                return;
            }

            // Configuration keys are case-insensitive, so a section spelled "maskinportensettings"
            // binds just the same and collides just the same. Every matching spelling is reported.
            foreach (var section in root.GetObjectValues())
            {
                if (
                    !string.Equals(
                        section.Key,
                        MaskinportenInvariants.ProvisionedSectionName,
                        StringComparison.OrdinalIgnoreCase
                    )
                    || section.Value.Type != JsonType.Object
                )
                {
                    continue;
                }

                CollectSectionDiagnostics(text, section, localOnly, diagnostics);
            }
        }
        catch (NanoJsonException)
        {
            // Malformed appsettings.json fails app startup on its own; a Maskinporten diagnostic would
            // be a confusing way to learn that.
        }
    }

    private static void CollectSectionDiagnostics(
        AdditionalText text,
        JsonValue.JsonProperty section,
        bool localOnly,
        List<Diagnostic> diagnostics
    )
    {
        var properties = section.Value.GetObjectValues().ToList();

        switch (MaskinportenInvariants.ClassifySection(properties.Select(property => property.Key)))
        {
            case MaskinportenSectionShape.ExternalClient:
                diagnostics.Add(
                    Create(
                        Diagnostics.Configuration.ExternalMaskinportenSectionCollision,
                        FileLocationHelper.GetLocation(text, section.KeyStart, section.KeyEnd),
                        localOnly,
                        section.Key
                    )
                );
                break;

            case MaskinportenSectionShape.ProvisionedOverlap:
                foreach (var property in properties)
                {
                    if (!MaskinportenInvariants.IsProvisionedKey(property.Key))
                    {
                        continue;
                    }

                    diagnostics.Add(
                        Create(
                            Diagnostics.Configuration.MaskinportenCredentialsCollision,
                            FileLocationHelper.GetLocation(text, property.KeyStart, property.Value.End),
                            localOnly,
                            section.Key,
                            property.Key
                        )
                    );
                }
                break;
        }
    }

    private static Diagnostic Create(
        DiagnosticDescriptor descriptor,
        Location location,
        bool localOnly,
        params object[] messageArgs
    ) =>
        Diagnostic.Create(
            descriptor,
            location,
            localOnly ? DiagnosticSeverity.Info : descriptor.DefaultSeverity,
            additionalLocations: null,
            properties: null,
            messageArgs
        );

    /// <summary>
    /// The file name portion of a path. Local rather than <c>System.IO.Path</c> so the analyzer's
    /// banned-API analysis (RS1035) has nothing to consider.
    /// </summary>
    internal static string GetFileName(string path)
    {
        var separator = path.LastIndexOfAny(['/', '\\']);
        return separator < 0 ? path : path.Substring(separator + 1);
    }
}
