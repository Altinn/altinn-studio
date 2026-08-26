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

        // Close to the runtime backstop in ServiceTaskPipelineBuilder.ClaimMailbox (which names the opening
        // stage's item index, which the analyzer cannot know), so an author who meets one of them after the
        // other reads one rule rather than two. '{0}' is the identifier of the local the handle was declared
        // into — what the author wrote to route this exchange to its handler.
        public static readonly DiagnosticDescriptor MailboxHandleAnsweredTwice = Error(
            "ALTINNAPP0702",
            Category.Contracts,
            "Mailbox handle answered twice",
            "The mailbox opened into '{0}' is already answered by an earlier handler. Each mailbox is answered "
                + "exactly once — by HandleReplies or by ConcludeOnReplies, never by both and never twice — so a "
                + "second handler for the same exchange would be dead code."
        );

        // Likewise close to the wording of ServiceTaskPipelineBuilder.RequireEveryMailboxAnswered, which is
        // what fails app startup for every shape this rule cannot prove.
        public static readonly DiagnosticDescriptor MailboxNeverAnswered = Error(
            "ALTINNAPP0703",
            Category.Contracts,
            "Mailbox opened but never answered",
            "The mailbox opened into '{0}' is never answered: its handle is never passed anywhere, so the "
                + "messages that come back would have no handler. Answer it before the pipeline ends — with "
                + "HandleReplies to carry on afterwards, or with ConcludeOnReplies to end there."
        );
    }

    public static class Authorization
    {
        public static readonly DiagnosticDescriptor MissingServiceOwnerGrant = Error(
            "ALTINNAPP0800",
            Category.Authorization,
            "Service owner is missing required authorization",
            "policy.xml does not permit the app owner '{0}' any of the action(s) [{1}] on {0}/{2}, which is "
                + "required because the app {3} as the service owner. Grant the action(s) to the org subject in "
                + "config/authorization/policy.xml, or run the v8 to v9 upgrade to have a rule inserted."
        );

        public static readonly DiagnosticDescriptor ServiceOwnerGrantNotVerifiable = Warning(
            "ALTINNAPP0801",
            Category.Authorization,
            "Service owner authorization could not be verified",
            "Could not verify that the app owner '{0}' is permitted the action(s) [{1}] on {0}/{2}: {3}. Verify "
                + "this manually - the app performs the corresponding operations as the service owner."
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
        public const string Contracts = nameof(Contracts);
        public const string Authorization = nameof(Authorization);
    }
}
