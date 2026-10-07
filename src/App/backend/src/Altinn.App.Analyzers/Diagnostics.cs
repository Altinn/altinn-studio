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
        // into.
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

    internal static class Metadata
    {
        // Close to the runtime backstop in DataHelper.GetDataFieldValues, so an author who meets one of
        // them after the other reads one explanation rather than two. Deliberately scoped to entries
        // sharing a data type - see MetadataFieldUtils for why the cross-data-type case is left alone.
        public static readonly DiagnosticDescriptor DuplicateFieldId = Error(
            "ALTINNAPP0900",
            Category.Metadata,
            "Duplicate field id in applicationmetadata.json",
            "'{0}' declares the id '{1}' twice for dataTypeId '{2}', on '{3}' and on '{4}'. The id is the key "
                + "the value is stored under on the instance, and the entries for one data type are computed "
                + "together into a map that cannot hold the same key twice - so the app fails instead of "
                + "computing either of them. Give each entry its own id."
        );

        public static readonly DiagnosticDescriptor UnknownFieldDataType = Error(
            "ALTINNAPP0901",
            Category.Metadata,
            "Field references an unknown data type",
            "'{0}' entry '{1}' names the dataTypeId '{2}', which no entry in 'dataTypes' declares. Nothing "
                + "computes it, so its value never reaches the instance. Point it at one of the app's data types, "
                + "or remove the entry."
        );
    }

    internal static class Process
    {
        // Worded like the runtime backstop in PdfServiceTask, so an author who meets one of them after the
        // other reads one explanation rather than two. Without these, a PDF service task that cannot be
        // rendered fails only when an instance reaches it, and the cause shows up only in the PDF generator's
        // browser log.
        public static readonly DiagnosticDescriptor PdfServiceTaskHasNothingToRender = Error(
            "ALTINNAPP1000",
            Category.Process,
            "PDF service task has nothing to render",
            "PDF service task '{0}' has nothing to render, so generating its PDF will fail. List the tasks to "
                + "include in <altinn:pdfConfig><altinn:autoPdfTaskIds>, or add a UI folder 'ui/{0}' with a "
                + "Settings.json to design the PDF yourself."
        );

        // Stricter than the runtime backstop, which fails only when autoPdfTaskIds lists tasks too. Without
        // them the frontend renders the folder's pages, which in the folder Altinn Studio creates is the
        // waiting page, so the PDF is never what the author designed.
        public static readonly DiagnosticDescriptor PdfServiceTaskMissingPdfLayoutName = Error(
            "ALTINNAPP1001",
            Category.Process,
            "PDF service task has a UI folder without pdfLayoutName",
            "PDF service task '{0}' has its own UI folder 'ui/{0}' without a pdfLayoutName. The folder's pages are "
                + "what people see while the process is at the task, and pdfLayoutName names the layout to render "
                + "as the PDF. Set pdfLayoutName in 'ui/{0}/Settings.json', or remove the UI folder and list the "
                + "tasks to include in <altinn:pdfConfig><altinn:autoPdfTaskIds>."
        );

        public static readonly DiagnosticDescriptor PdfServiceTaskIncludesTaskWithoutUi = Warning(
            "ALTINNAPP1002",
            Category.Process,
            "PDF service task includes a task without a UI folder",
            "PDF service task '{0}' lists '{1}' in <altinn:autoPdfTaskIds>, but there is no UI folder "
                + "'ui/{1}', so the PDF will contain nothing from that task. Check that the task id is correct."
        );

        // Worded like the runtime backstop in ProcessTaskConfigurationValidationService, which also covers the
        // types this rule cannot see: those from packages, and a Type that is not a constant. Reported once the
        // whole compilation is analyzed, since a task's type can be declared by any class in it.
        public static readonly DiagnosticDescriptor TaskUsesWrongElement = Error(
            "ALTINNAPP1003",
            Category.Process,
            "Task uses the wrong BPMN element",
            "Task '{0}' declares <altinn:taskType>{1}</altinn:taskType>, which is {2}, but is a <{3}> element. "
                + "Change it to a <{4}> element.",
            WellKnownDiagnosticTags.CompilationEnd
        );

        // The flow rules below have no runtime backstop at startup: a broken flow surfaces as a ProcessException,
        // or worse, only when an instance tries to leave the element in question. ProcessFlowUtils documents the
        // model they share: which nodes and flows they check, and the two rules (ALTINNAPP1005 for an unlisted flow,
        // and ALTINNAPP1009) that go beyond what fails at runtime.
        // '{0}' names the flow, and '{1}' completes the sentence with what is wrong, such as "has no targetRef".
        public static readonly DiagnosticDescriptor SequenceFlowLeadsToUnsupportedElement = Error(
            "ALTINNAPP1004",
            Category.Process,
            "Sequence flow leads to an element the app cannot move to",
            "{0} {1}. An instance can move only to the tasks, service tasks, exclusive gateways and end events of "
                + "the process. Point the flow at one of them, or remove it."
        );

        // '{1}' completes the sentence with the discrepancy, naming the flow.
        public static readonly DiagnosticDescriptor GatewayOutgoingMismatch = Error(
            "ALTINNAPP1005",
            Category.Process,
            "Exclusive gateway's outgoing list does not match its sequence flows",
            "Exclusive gateway '{0}' {1}. The app leaves a gateway only through the sequence flows it lists in "
                + "<bpmn:outgoing>, so every flow that starts at the gateway must be listed, and every listed flow "
                + "must start there. List exactly those flows in <bpmn:outgoing>."
        );

        // Only a warning: a default the app cannot find is ignored, which fails only when the gateway's other
        // flows do not narrow the choice to one.
        public static readonly DiagnosticDescriptor GatewayDefaultNotOutgoing = Warning(
            "ALTINNAPP1006",
            Category.Process,
            "Exclusive gateway's default is not one of the flows it lists",
            "Exclusive gateway '{0}' has default '{1}', which is not a sequence flow it lists in <bpmn:outgoing>, "
                + "so the app ignores the default. Set default to one of the listed flows, or remove it."
        );

        public static readonly DiagnosticDescriptor ElementHasSeveralOutgoingFlows = Error(
            "ALTINNAPP1007",
            Category.Process,
            "Element has more than one outgoing sequence flow",
            "{0} '{1}' has {2} outgoing sequence flows ({3}), so the app cannot tell which one to follow and "
                + "fails when an instance leaves it. Route the flows through an exclusive gateway."
        );

        public static readonly DiagnosticDescriptor ElementHasNoOutgoingFlow = Error(
            "ALTINNAPP1008",
            Category.Process,
            "Element has no outgoing sequence flow",
            "{0} '{1}' has no outgoing sequence flow, so an instance that reaches it can never move on. Connect it "
                + "to the next element of the process."
        );

        // '{1}' counts the nodes and sequence flows with the id; see ProcessFlowUtils for why they share one count.
        public static readonly DiagnosticDescriptor DuplicateProcessElementId = Error(
            "ALTINNAPP1009",
            Category.Process,
            "Duplicate element id in the process",
            "The id '{0}' is used by {1} elements of the process. Give each element its own id."
        );

        // A condition on one listed flow makes the app evaluate them all with ExpressionsExclusiveGateway, which
        // counts a flow without a condition as a match, and more than one match fails. '{1}' lists the flows
        // without a condition, and '{2}' completes the sentence with when that fails: one such flow fails only
        // alongside a condition that holds, two or more always match together.
        public static readonly DiagnosticDescriptor GatewayMixesConditions = Error(
            "ALTINNAPP1010",
            Category.Process,
            "Exclusive gateway mixes flows with and without a condition",
            "Exclusive gateway '{0}' has a condition on some outgoing sequence flows, but none on {1}. The app "
                + "treats a flow without a condition as always true, {2}. Give every outgoing flow a condition."
        );

        // Only a warning: the conditions on the flows may keep every instance out of the loop. '{1}' completes the
        // sentence with the other gateways in the loop.
        public static readonly DiagnosticDescriptor GatewayLoop = Warning(
            "ALTINNAPP1011",
            Category.Process,
            "Exclusive gateways form a loop",
            "Exclusive gateway '{0}' {1}, with no task in between. An instance that follows the loop makes the app "
                + "recurse until the process crashes. Put a task in the loop, or remove one of its sequence flows."
        );

        // ExpressionsExclusiveGateway evaluates every listed flow, and parsing an empty condition throws
        // (GetExpressionFromCondition), so the gateway fails whatever the instance data. '{1}' names the flow.
        public static readonly DiagnosticDescriptor GatewayEmptyCondition = Error(
            "ALTINNAPP1012",
            Category.Process,
            "Exclusive gateway lists a flow with an empty condition",
            "Exclusive gateway '{0}' lists {1}, which has an empty condition, so the app fails every time an instance "
                + "leaves the gateway. Give the flow a condition, or remove the empty <bpmn:conditionExpression>."
        );

        // Only for references whose failure is certain: an unknown id fails startup, the sign or payment action, or
        // the task when an instance reaches it. The others are ALTINNAPP1018 and ALTINNAPP1019.
        // '{1}' is the quoted id, or says that it is empty.
        public static readonly DiagnosticDescriptor UnknownDataType = Error(
            "ALTINNAPP1013",
            Category.Process,
            "Process references an unknown data type",
            "Task '{0}' names {1} in {2}, but no entry in 'dataTypes' in applicationmetadata.json has that id, so the "
                + "app fails where it uses it. Correct the id, or add the data type."
        );

        // Nothing creates the data type, and nothing checks for it at startup: the PDF is generated and then fails
        // to be stored, whenever the task generates one. '{2}' says when that is.
        public static readonly DiagnosticDescriptor PdfDataTypeMissing = Error(
            "ALTINNAPP1014",
            Category.Process,
            "PDF service task has no data type to store its PDFs in",
            "Task '{0}' of type '{1}' stores the PDFs it generates in the data type 'ref-data-as-pdf', but no entry "
                + "in 'dataTypes' in applicationmetadata.json has that id, so storing them fails {2}. Add a data type "
                + "'ref-data-as-pdf' with allowedContentTypes [\"application/pdf\"]."
        );

        // '{3}' says what is wrong with the data type and what happens, '{4}' how to fix it.
        public static readonly DiagnosticDescriptor DataTypeCannotHoldTaskData = Error(
            "ALTINNAPP1015",
            Category.Process,
            "Data type cannot hold what the task stores in it",
            "Task '{0}' stores {1} in the data type '{2}', but {3}. {4}."
        );

        // A warning, since only the Development startup check (AllowedContributorsHelper) fails on it. Who else may
        // write depends on the list (AllowedContributorsHelper.IsValidContributor): anyone when it is empty, the
        // service owners it names otherwise.
        public static readonly DiagnosticDescriptor DataTypeNotAppOwned = Warning(
            "ALTINNAPP1016",
            Category.Process,
            "Data type must be app-owned",
            "Task '{0}' keeps {1} in the data type '{2}', whose allowedContributors is not exactly [\"app:owned\"]. "
                + "The app does not start in the Development environment, and parties other than the app may be "
                + "able to change that data through the app's API. Set allowedContributors to [\"app:owned\"]."
        );

        // A warning, since keeping a data type for a task that was removed is legitimate: old instances still hold
        // its data.
        public static readonly DiagnosticDescriptor DataTypeTaskNotFound = Warning(
            "ALTINNAPP1017",
            Category.Process,
            "Data type belongs to a task that does not exist",
            "Data type '{0}' has the taskId '{1}', but {2}. The process never stops there, so users cannot change "
                + "the data type's data through the app, and its minCount and validation never apply. Set taskId to "
                + "the task the data belongs to, or remove it."
        );

        // A warning, since nothing fails: the runtime filters by these ids, so one that matches nothing is skipped.
        // '{1}' is the quoted id, '{3}' says what the app skips, '{4}' how to fix it.
        public static readonly DiagnosticDescriptor DataTypeIgnored = Warning(
            "ALTINNAPP1018",
            Category.Process,
            "Process references a data type that the app skips",
            "Task '{0}' names {1} in {2}, but {3}. {4}."
        );

        // A warning, since the connected data type matters only to conditions that read the data model without
        // naming a data type (ExpressionsExclusiveGateway), and to the app's own gateway for that id.
        public static readonly DiagnosticDescriptor GatewayUnknownDataType = Warning(
            "ALTINNAPP1019",
            Category.Process,
            "Exclusive gateway references an unknown data type",
            "Exclusive gateway '{0}' names {1} in <altinn:connectedDataTypeId>, but no entry in 'dataTypes' in "
                + "applicationmetadata.json has that id. The gateway's conditions then find no data element, so a "
                + "condition that reads [\"dataModel\", ...] without naming a data type fails when an instance "
                + "leaves the gateway. Correct the id, or add the data type."
        );

        // Only for settings without which the built-in task type fails for certain: at startup, or every time the task
        // runs. Startup checks most of them for null only, and an empty element reads as an empty string, which passes;
        // settings that differ by environment it checks only for the environment the app runs in. Also for a value the
        // app cannot read as the type it expects, which fails loading the process or the task's startup check. '{1}'
        // says what is missing or invalid, and where; '{2}' what happens; '{3}' how to fix it.
        public static readonly DiagnosticDescriptor TaskSettingInvalid = Error(
            "ALTINNAPP1020",
            Category.Process,
            "Task configuration is missing a required setting or has an invalid value",
            "Task '{0}' {1}, so {2}. {3}."
        );

        // A warning, since nothing fails where the element is: the runtime deserializes the process with
        // XmlSerializer, which skips what it does not read, so the setting is lost without a word. Elements with
        // other names in other namespaces belong to other tools and are left alone. '{1}' is the element, '{2}' its
        // parent, '{3}' why the app ignores it, '{4}' how to fix it.
        public static readonly DiagnosticDescriptor TaskConfigurationElementIgnored = Warning(
            "ALTINNAPP1021",
            Category.Process,
            "Task configuration contains an element the app ignores",
            "Task '{0}' has {1} in {2}, which {3}. {4}."
        );

        // For an env attribute that does not do what it says: a name the app does not recognize, which applies in
        // none of the environments, and an attribute the app does not read, because of its case or namespace prefix or
        // because the element takes none, which applies in every one. A warning, since the entry may be meant for an
        // environment name the app does not recognize either: the runtime maps every such name to the same unknown
        // environment. '{1}' is the attribute, '{2}' the element it is on, '{3}' what the app makes of it, '{4}' how
        // to fix it.
        public static readonly DiagnosticDescriptor UnusableEnvironmentAttribute = Warning(
            "ALTINNAPP1022",
            Category.Process,
            "Task configuration has an env attribute the app cannot use",
            "Task '{0}' has {1} on {2}, {3}. {4}."
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

    private const string DocsRoot =
        "https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/analysis/";
    private const string RulesRoot = DocsRoot + "rules/";

    private static DiagnosticDescriptor Warning(string id, string category, string title, string messageFormat) =>
        Create(id, title, messageFormat, category, DiagnosticSeverity.Warning);

    private static DiagnosticDescriptor Error(
        string id,
        string category,
        string title,
        string messageFormat,
        params string[] customTags
    ) => Create(id, title, messageFormat, category, DiagnosticSeverity.Error, customTags);

    private static DiagnosticDescriptor Create(
        string id,
        string title,
        string messageFormat,
        string category,
        DiagnosticSeverity severity,
        params string[] customTags
    ) =>
        new(
            id,
            title,
            messageFormat,
            category,
            severity,
            true,
            helpLinkUri: RulesRoot + id.ToLowerInvariant(),
            customTags: customTags
        );

    private static class Category
    {
        public const string General = nameof(General);
        public const string Metadata = nameof(Metadata);
        public const string CodeSmells = nameof(CodeSmells);
        public const string Deprecation = nameof(Deprecation);
        public const string Contracts = nameof(Contracts);
        public const string Authorization = nameof(Authorization);
        public const string Process = nameof(Process);
    }
}
