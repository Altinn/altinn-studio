using Altinn.Studio.MaskinportenRules;

namespace Altinn.App.Analyzers;

public static class Diagnostics
{
    public static readonly DiagnosticDescriptor UnknownError = Warning(
        "ALTINNAPP9999",
        Category.General,
        "Unknown analyzer error",
        "Unknown error occurred during analysis, contact support: '{0}' {1}"
    );

    public static readonly DiagnosticDescriptor ProjectNotFound = Warning(
        "ALTINNAPP0001",
        Category.General,
        "Altinn app project not found",
        "While starting analysis, we couldn't find the project directory - contact support"
    );

    public static class CodeSmells
    {
        public static readonly DiagnosticDescriptor HttpContextAccessorUsage = Warning(
            "ALTINNAPP0500",
            Category.CodeSmells,
            "HttpContextAccessor dangerous usage",
            "IHttpContextAccessor.HttpContext should not be accessed in a constructor, see guidance at: https://learn.microsoft.com/en-us/aspnet/core/fundamentals/use-http-context?view=aspnetcore-8.0#httpcontext-isnt-thread-safe"
        );
    }

    public static class FormDataWrapperGenerator
    {
        public static readonly DiagnosticDescriptor AppMetadataError = Warning(
            "ALTINNAPP0002",
            Category.Metadata,
            "Application metadata error",
            "Error in applicationmetadata.json: {0}"
        );
    }

    public static class Contracts
    {
        public static readonly DiagnosticDescriptor SealedImplementationReplaced = Error(
            "ALTINNAPP0700",
            Category.Contracts,
            "Sealed default implementation replaced",
            "'{0}' replaces '{1}', whose default implementation on '{2}' is sealed. {3}."
        );

        public static readonly DiagnosticDescriptor IncompleteBuilderDiscarded = Error(
            "ALTINNAPP0701",
            Category.Contracts,
            "Incomplete registration discarded",
            "The result of '{0}' is discarded, but '{1}' is not a usable registration on its own. {2}."
        );
    }

    internal static class Configuration
    {
        public static readonly DiagnosticDescriptor ExternalMaskinportenSectionCollision = Warning(
            "ALTINNAPP0800",
            Category.Configuration,
            "External Maskinporten client bound to the provisioned section",
            "The '{0}' configuration section configures an external Maskinporten client, but that name belongs to "
                + "the platform-provisioned client - in deployed environments the provisioned clientId replaces yours "
                + "while your own key is still used, and Maskinporten rejects the token request. Rename the section "
                + "(for example to MaskinportenSettingsLegacy) and bind it explicitly where you register the external client.",
            MaskinportenInvariants.ExternalShapeGuidance
        );

        public static readonly DiagnosticDescriptor MaskinportenCredentialsCollision = Warning(
            "ALTINNAPP0801",
            Category.Configuration,
            "Maskinporten credentials collide with the platform-provisioned credentials",
            "The '{0}' configuration section supplies '{1}', which the platform also provisions at deploy time - the "
                + "provisioned settings file is applied after appsettings.json and configuration merges key by key, "
                + "combining the two sets into credentials that belong to neither client. Remove it and let the app "
                + "use the provisioned credentials.",
            MaskinportenInvariants.ProvisionedOverlapGuidance
        );

        public static readonly DiagnosticDescriptor MaskinportenClientOverride = Warning(
            "ALTINNAPP0802",
            Category.Configuration,
            "Default Maskinporten client redirected",
            "'{0}' redirects the default Maskinporten client away from the credentials the platform provisions at "
                + "deploy time - the workflow engine mints the app's service owner tokens through that client, so "
                + "process transitions fail once deployed. Give your own integration its own settings type and "
                + "HttpClient registration instead, and leave the default client alone.",
            MaskinportenInvariants.ClientOverrideGuidance
        );
    }

    internal static class Deprecations
    {
        public static readonly DiagnosticDescriptor EnablePdfCreation = Error(
            "ALTINNAPP0600",
            Category.Deprecation,
            "enablePdfCreation is not supported",
            "'enablePdfCreation' on dataType '{0}' is no longer supported by this version of the app backend. Generate PDFs with a PDF service task instead."
        );

        public static readonly DiagnosticDescriptor LegacyEFormidling = Error(
            "ALTINNAPP0601",
            Category.Deprecation,
            "Legacy eFormidling configuration is not supported",
            "The 'eFormidling' configuration block in applicationmetadata.json is no longer supported. Configure eFormidling on a BPMN eFormidling service task instead."
        );
    }

    private const string DocsRoot = "https://docs.altinn.studio/nb/altinn-studio/v8/reference/analysis/";
    private const string RulesRoot = DocsRoot + "rules/";

    private static DiagnosticDescriptor Warning(
        string id,
        string category,
        string title,
        string messageFormat,
        string? description = null
    ) => Create(id, title, messageFormat, category, DiagnosticSeverity.Warning, description);

    private static DiagnosticDescriptor Error(string id, string category, string title, string messageFormat) =>
        Create(id, title, messageFormat, category, DiagnosticSeverity.Error);

    private static DiagnosticDescriptor Create(
        string id,
        string title,
        string messageFormat,
        string category,
        DiagnosticSeverity severity,
        string? description = null
    ) =>
        new(
            id,
            title,
            messageFormat,
            category,
            severity,
            true,
            description: description,
            helpLinkUri: RulesRoot + id.ToLowerInvariant()
        );

    private static class Category
    {
        public const string General = nameof(General);
        public const string Metadata = nameof(Metadata);
        public const string CodeSmells = nameof(CodeSmells);
        public const string Deprecation = nameof(Deprecation);
        public const string Contracts = nameof(Contracts);
        public const string Configuration = nameof(Configuration);
    }
}
