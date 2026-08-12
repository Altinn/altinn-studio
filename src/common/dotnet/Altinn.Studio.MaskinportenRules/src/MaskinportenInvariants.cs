using System;
using System.Collections.Generic;

namespace Altinn.Studio.MaskinportenRules;

/// <summary>
/// The single definition of the v9 Maskinporten configuration invariants, source-linked into both the
/// app Roslyn analyzer (<c>Altinn.App.Analyzers</c>) and studioctl's v8→v9 upgrade detectors
/// (<c>studioctl-server</c>) so the two cannot drift.
/// <para>
/// Every v9 app has a built-in Maskinporten client — the workflow engine's callbacks mint service owner
/// tokens through it — and Studio provisions its credentials at deploy time as a settings file whose root
/// is a <c>MaskinportenSettings</c> section, applied <em>after</em> <c>appsettings.json</c>. Because .NET
/// configuration merges key by key, an app supplying its own values under that section combines with the
/// provisioned ones into credentials belonging to neither client; and because
/// <c>AddMaskinportenClient</c> only binds the provisioned section when nothing configured those options
/// first, an app's own <c>ConfigureMaskinportenClient</c> call redirects the client away from the
/// provisioned credentials entirely. Both failures are silent and deployed-environments-only.
/// </para>
/// <para>
/// This type must stay pure data and functions: it compiles into a <c>netstandard2.0</c> Roslyn analyzer
/// (no file or environment access, C# 12, no external dependencies) and must not assume whether the
/// consumer scans syntax trees, semantic models, or JSON documents.
/// </para>
/// </summary>
public static class MaskinportenInvariants
{
    /// <summary>The configuration section Studio provisions the built-in client's credentials under.</summary>
    public const string ProvisionedSectionName = "MaskinportenSettings";

    /// <summary>The extension method that configures the default (built-in) Maskinporten client.</summary>
    public const string ConfigureClientMethodName = "ConfigureMaskinportenClient";

    /// <summary>
    /// Keys that only ever belong to the external <c>Altinn.ApiClients.Maskinporten</c> package's settings
    /// shape. Their presence is what distinguishes "this app configured the external client" from "this
    /// app pinned the built-in one". (<c>ExhangeToAltinnToken</c> mirrors the external package's own
    /// misspelling.)
    /// </summary>
    private static readonly HashSet<string> _externalOnlyKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "Environment",
        "EncodedJwk",
        "EncodedX509",
        "CertificatePkcs12Path",
        "CertificatePkcs12Password",
        "CertificateStoreThumbprint",
        "ExhangeToAltinnToken",
        "Scope",
        "ConsumerOrgNo",
        "EnterpriseUserName",
        "EnterpriseUserPassword",
        "EnableDebugLogging",
        "ClientKey",
    };

    /// <summary>
    /// Keys the platform-provisioned settings file also supplies, so an app-supplied value is replaced or
    /// merged at deploy time. <c>authority</c> is deliberately absent: it carries no identity, and the
    /// provisioned value overriding it is the correct outcome rather than a hazard.
    /// </summary>
    private static readonly HashSet<string> _provisionedKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "clientId",
        "jwk",
        "jwkBase64",
    };

    /// <summary>Whether the key only ever appears in the external package's settings shape.</summary>
    public static bool IsExternalOnlyKey(string key) => _externalOnlyKeys.Contains(key);

    /// <summary>Whether the platform-provisioned settings file also supplies this key.</summary>
    public static bool IsProvisionedKey(string key) => _provisionedKeys.Contains(key);

    /// <summary>
    /// Classifies a <c>MaskinportenSettings</c> section by its keys. Any external-only key makes the
    /// section <see cref="MaskinportenSectionShape.ExternalClient"/> — that verdict takes precedence, since
    /// it identifies whose section this is and carries its own remediation (rename the section). Otherwise
    /// any provisioned key makes it <see cref="MaskinportenSectionShape.ProvisionedOverlap"/>. A section
    /// with neither (for example only <c>authority</c>) is benign.
    /// </summary>
    public static MaskinportenSectionShape ClassifySection(IEnumerable<string> keys)
    {
        var anyProvisioned = false;
        foreach (var key in keys)
        {
            if (_externalOnlyKeys.Contains(key))
            {
                return MaskinportenSectionShape.ExternalClient;
            }

            anyProvisioned |= _provisionedKeys.Contains(key);
        }

        return anyProvisioned ? MaskinportenSectionShape.ProvisionedOverlap : MaskinportenSectionShape.None;
    }

    /// <summary>
    /// Whether a <see cref="ConfigureClientMethodName"/> call passing this section path just re-binds the
    /// provisioned section, which is what the default registration would have done anyway and therefore
    /// changes nothing. Configuration keys are case-insensitive, so any casing of the name is the same
    /// no-op.
    /// </summary>
    public static bool RebindsProvisionedSection(string configSectionPath) =>
        string.Equals(configSectionPath, ProvisionedSectionName, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Whether the file name is the conventional local-development settings file
    /// (<c>appsettings.Development.json</c>). Deployed environments never load it, so credentials there
    /// are a local concern rather than a deployment break.
    /// </summary>
    public static bool IsDevelopmentSettingsFileName(string fileName) =>
        string.Equals(fileName, "appsettings.Development.json", StringComparison.OrdinalIgnoreCase);

    /// <summary>Whether the file name is an <c>appsettings*.json</c> configuration file.</summary>
    public static bool IsAppSettingsFileName(string fileName) =>
        fileName is not null
        && fileName.StartsWith("appsettings", StringComparison.OrdinalIgnoreCase)
        && fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Guidance for an external-package-shaped section named <see cref="ProvisionedSectionName"/>.
    /// </summary>
    public const string ExternalShapeGuidance =
        "This app configures the external Maskinporten client in a section named "
        + ProvisionedSectionName
        + ", which in v9 is the section the platform-provisioned Maskinporten client reads. Studio provisions "
        + "those credentials as a settings file that is applied after appsettings.json, and configuration merges "
        + "key by key - so in deployed environments the provisioned clientId replaces yours while your own key is "
        + "still used, and Maskinporten rejects the token request. Rename your own section (for example to "
        + "MaskinportenSettingsLegacy) and bind it explicitly where you register the external client; leave "
        + ProvisionedSectionName
        + " to the built-in client.";

    /// <summary>
    /// Guidance for a section supplying keys the platform also provisions
    /// (<c>clientId</c>/<c>jwk</c>/<c>jwkBase64</c>).
    /// </summary>
    public const string ProvisionedOverlapGuidance =
        "This app supplies Maskinporten credentials under keys the platform also provisions ("
        + ProvisionedSectionName
        + ".clientId/jwk/jwkBase64). Studio provides these automatically at deploy time, and its settings file is "
        + "applied after appsettings.json, merging key by key - so the two sets are combined rather than one "
        + "replacing the other. A checked-in jwkBase64 takes precedence over the provisioned key while clientId "
        + "does not, leaving the app signing with its own key under the provisioned client id, which Maskinporten "
        + "rejects. Remove these keys and let the app use the provisioned credentials. A private key in the "
        + "repository is worth removing on its own merits.";

    /// <summary>
    /// Guidance for a <see cref="ConfigureClientMethodName"/> call that redirects the default client.
    /// </summary>
    public const string ClientOverrideGuidance =
        "This app calls "
        + ConfigureClientMethodName
        + ", which takes over the default Maskinporten client. In v9 "
        + "that client is shared infrastructure: Studio provisions its credentials at deploy time, and the "
        + "workflow engine mints the app's service owner tokens through it, so redirecting it to another configuration "
        + "section or a custom lambda means the provisioned credentials are never read and process transitions "
        + "fail once deployed - silently, and only in a deployed environment. If this configures a Maskinporten "
        + "client for the app's own integration, give that integration its own settings type and HttpClient "
        + "registration instead, and leave the default client alone.";
}

/// <summary>The classification of a <c>MaskinportenSettings</c> section's keys.</summary>
public enum MaskinportenSectionShape
{
    /// <summary>No hazardous keys; the section is benign.</summary>
    None,

    /// <summary>
    /// The section carries external-package-only keys: the app configured the external Maskinporten
    /// client under the name the provisioned client reads.
    /// </summary>
    ExternalClient,

    /// <summary>
    /// The section supplies keys the platform also provisions (<c>clientId</c>/<c>jwk</c>/<c>jwkBase64</c>).
    /// </summary>
    ProvisionedOverlap,
}
