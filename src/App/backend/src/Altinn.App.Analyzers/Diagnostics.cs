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

        public static readonly DiagnosticDescriptor MutatorStorageClientUsage = Warning(
            "ALTINNAPP0501",
            Category.CodeSmells,
            "Direct Storage client used during active unit of work",
            "Avoid using direct Storage client '{0}' in '{1}' because this code can run during an active InstanceDataUnitOfWork. Use the provided IInstanceDataAccessor/IInstanceDataMutator when available, or move direct Storage access outside the active unit of work."
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

    private static DiagnosticDescriptor Warning(string id, string category, string title, string messageFormat) =>
        Create(id, title, messageFormat, category, DiagnosticSeverity.Warning);

    private static DiagnosticDescriptor Error(string id, string category, string title, string messageFormat) =>
        Create(id, title, messageFormat, category, DiagnosticSeverity.Error);

    private static DiagnosticDescriptor Create(
        string id,
        string title,
        string messageFormat,
        string category,
        DiagnosticSeverity severity
    ) => new(id, title, messageFormat, category, severity, true, helpLinkUri: RulesRoot + id.ToLowerInvariant());

    private static class Category
    {
        public const string General = nameof(General);
        public const string Metadata = nameof(Metadata);
        public const string CodeSmells = nameof(CodeSmells);
        public const string Deprecation = nameof(Deprecation);
    }
}
