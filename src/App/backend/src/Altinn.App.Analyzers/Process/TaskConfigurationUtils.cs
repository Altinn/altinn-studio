using System.Globalization;
using System.Xml;
using System.Xml.Linq;
using Altinn.App.Analyzers.Utils;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks the configuration of the tasks in <c>config/process/process.bpmn</c> as the runtime reads it. The runtime
/// deserializes the process with <c>XmlSerializer</c> (<c>ProcessReader</c> in Altinn.App.Core), which reads an empty
/// element as an empty string, reads only the first of an element that holds a single value, and skips elements it
/// does not know. Its startup checks test most settings for null only, and resolve a setting that differs by
/// environment for the environment the app runs in only, so a missing production value otherwise surfaces when the
/// app is deployed to production. The required settings follow the built-in implementation of each task type,
/// assuming it is the one that runs; an app can replace a built-in type with its own task class, which this does not
/// look for.
/// </summary>
internal static class TaskConfigurationUtils
{
    /// <summary>The eFormidling settings that must have a value in every environment (AltinnEFormidlingConfiguration).</summary>
    private static readonly string[] _eFormidlingRequired = ["process", "standard", "typeVersion", "type"];

    /// <summary>
    /// The values of an action's <c>type</c> attribute: the <c>XmlEnum</c> names of <c>ActionType</c>, pinned to it by
    /// <c>TaskConfigurationSchemaTests</c>.
    /// </summary>
    internal static readonly ImmutableArray<string> ActionTypes = ["processAction", "serverAction"];

    /// <summary>The environments where delegated signing needs a correspondence resource (SigningProcessTask).</summary>
    private static readonly string[] _correspondenceEnvironments =
    [
        HostingEnvironments.Staging,
        HostingEnvironments.Production,
    ];

    /// <summary>
    /// Appends a diagnostic for every setting a built-in task type needs and does not get, for every element in a task's
    /// configuration that the app ignores, and for every environment name the app cannot use.
    /// </summary>
    internal static void CollectDiagnostics(
        ImmutableArray<AdditionalText> additionalFiles,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var processFile = ProcessFile.FindSingle(additionalFiles);
        if (processFile is null || ProcessFile.TryParse(processFile, token) is not { } parsed)
        {
            return;
        }

        // The runtime binds the tasks directly in the process.
        if (ProcessFile.SingleProcess(parsed.Document) is not { } process)
        {
            return;
        }

        var context = new Context(processFile, parsed.Content, diagnostics);
        foreach (var task in process.Elements())
        {
            if (
                (task.Name != ProcessFile.Task && task.Name != ProcessFile.ServiceTask)
                || task.Attribute("id")?.Value is not { Length: > 0 } taskId
            )
            {
                continue;
            }

            // Like every element that holds a single value, only the first of each is read. A task without a task
            // extension has no type, which the startup check reports.
            var taskExtension = task.Element(ProcessFile.ExtensionElements)?.Element(ProcessFile.TaskExtension);
            if (taskExtension is null)
            {
                continue;
            }

            // Every task reads its task extension the same way, whatever its type.
            var schema = TaskConfigurationSchema.TaskExtension;
            ReportIgnoredElements(context, taskId, taskExtension, schema, Tag(schema.Name));
            ReportUnreadableValues(context, taskId, taskExtension);

            // Compared as written, like the runtime, which resolves the task's implementation by exact type.
            switch (taskExtension.Element(ProcessFile.TaskType)?.Value)
            {
                case "signing":
                    CheckSigning(context, task, taskId, taskExtension);
                    break;
                case "payment":
                    CheckPayment(context, task, taskId, taskExtension);
                    break;
                case "subformPdf":
                    CheckSubformPdf(context, task, taskId, taskExtension);
                    break;
                case "eFormidling":
                    CheckEFormidling(context, task, taskId, taskExtension);
                    break;
            }
        }
    }

    /// <summary>
    /// Reports the values that XmlSerializer cannot convert to the type it reads them into. It throws, which fails
    /// loading the process (ProcessReader) and so app startup, whatever the task's type. It reads only the first
    /// <c>runDefaultValidator</c> of the first <c>signatureConfig</c>, and every action in every <c>actions</c>.
    /// </summary>
    private static void ReportUnreadableValues(Context context, string taskId, XElement taskExtension)
    {
        const string configName = "signatureConfig";
        var runDefaultValidator = taskExtension
            .Element(ProcessFile.Altinn + configName)
            ?.Element(ProcessFile.Altinn + "runDefaultValidator");
        if (runDefaultValidator is not null && !IsXmlBoolean(runDefaultValidator.Value))
        {
            var path = Path(configName, runDefaultValidator.Name.LocalName);
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                runDefaultValidator,
                taskId,
                IsBlank(runDefaultValidator)
                    ? $"has an empty {path}"
                    : $"has '{runDefaultValidator.Value}' in {path}, which is not true or false",
                "the app does not start",
                "Use true or false, in lowercase"
            );
        }

        // ActionType binds the attribute in the action's own namespace, which XmlSerializer reads as unqualified:
        // it reads type="..." and ignores altinn:type="...". It matches the enum's names exactly, without trimming.
        var actions = taskExtension.Elements(ProcessFile.Altinn + "actions").Elements(ProcessFile.Altinn + "action");
        foreach (var action in actions)
        {
            var type = action.Attribute("type");
            if (type is not null && !ActionTypes.Contains(type.Value))
            {
                context.Report(
                    Diagnostics.Process.TaskSettingInvalid,
                    action,
                    taskId,
                    $"has type=\"{type.Value}\" on {Path("actions", "action")}, which is neither processAction nor "
                        + "serverAction",
                    "the app does not start",
                    "Use one of those, or remove it for a process action"
                );
            }
        }
    }

    /// <summary>Whether XmlSerializer reads <paramref name="value"/> as a <c>bool</c> (XmlConvert.ToBoolean).</summary>
    private static bool IsXmlBoolean(string value)
    {
        try
        {
            XmlConvert.ToBoolean(value);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    /// <summary>
    /// Mirrors <c>SigningProcessTask.ValidateConfiguration</c>, which runs at startup in every environment, and
    /// <c>SigningUserAction</c>, which fails when no data type to sign is configured. A missing signatureConfig reads as
    /// an empty one (AltinnTaskExtension).
    /// </summary>
    private static void CheckSigning(Context context, XElement task, string taskId, XElement taskExtension)
    {
        const string configName = "signatureConfig";
        var config = taskExtension.Element(ProcessFile.Altinn + configName);
        var anchor = config ?? task;

        RequireValue(
            context,
            anchor,
            taskId,
            config,
            configName,
            "signatureDataType",
            "the app does not start",
            // In Development, startup looks the id up in applicationmetadata.json (AllowedContributorsHelper), which
            // fails for an empty one. Elsewhere, Storage rejects a signature in a data type the app does not declare.
            "the app does not start in Development, and the sign action fails every time elsewhere",
            "Name the data type that stores the signatures"
        );

        // The sign action signs the data types in the list that applicationmetadata.json declares, and fails when it
        // finds none. Lists that occur more than once are joined.
        var lists = config?.Elements(ProcessFile.Altinn + "dataTypesToSign").ToList() ?? [];
        if (!lists.Elements(ProcessFile.Altinn + "dataType").Any(e => !string.IsNullOrWhiteSpace(e.Value)))
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                lists.FirstOrDefault() ?? anchor,
                taskId,
                $"names no data type in {Path(configName, "dataTypesToSign")}",
                "the sign action fails every time",
                $"List the data types to sign as {Tag("dataType")} entries"
            );
        }

        // Startup checks these two for null: both or neither. An empty provider id matches no provider, so startup
        // fails. An empty data type id fails startup in Development, which looks it up in applicationmetadata.json,
        // and elsewhere when the task starts and stores the signee states, which it does only with a provider.
        var provider = config?.Element(ProcessFile.Altinn + "signeeProviderId");
        var states = config?.Element(ProcessFile.Altinn + "signeeStatesDataTypeId");
        if (provider is not null && states is null)
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                provider,
                taskId,
                $"has {Path(configName, "signeeProviderId")} but no {Tag("signeeStatesDataTypeId")}",
                "the app does not start",
                $"Add {Tag("signeeStatesDataTypeId")} with the data type that stores the signee states, or remove "
                    + Tag("signeeProviderId")
            );
        }
        else if (provider is null && states is not null)
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                states,
                taskId,
                $"has {Path(configName, "signeeStatesDataTypeId")} but no {Tag("signeeProviderId")}",
                "the app does not start",
                $"Add {Tag("signeeProviderId")} with the Id of the app's signee provider, or remove "
                    + Tag("signeeStatesDataTypeId")
            );
        }

        if (provider is not null && IsBlank(provider))
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                provider,
                taskId,
                $"has an empty {Path(configName, "signeeProviderId")}",
                "the app does not start",
                $"Set it to the Id of the app's signee provider, or remove it and {Tag("signeeStatesDataTypeId")}"
            );
        }

        if (states is not null && IsBlank(states))
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                states,
                taskId,
                $"has an empty {Path(configName, "signeeStatesDataTypeId")}",
                provider is null
                    ? "the app does not start"
                    : "the app does not start in Development, and the task fails every time it starts elsewhere",
                "Name the data type that stores the signee states"
            );
        }

        if (config is null)
        {
            return;
        }

        // Signees are notified through Correspondence, which startup requires in Staging and Production only; it
        // logs a warning in Development.
        if (provider is not null)
        {
            var resources = config.Elements(ProcessFile.Altinn + "correspondenceResource").ToList();
            foreach (var problem in FindProblems(resources, _correspondenceEnvironments, required: true))
            {
                if (problem.Element is not null)
                {
                    ReportEnvironmentProblem(context, taskId, config, "correspondenceResource", problem, [], null);
                    continue;
                }

                context.Report(
                    Diagnostics.Process.TaskSettingInvalid,
                    provider,
                    taskId,
                    $"has {Path(configName, "signeeProviderId")} but no {Tag("correspondenceResource")} "
                        + EnvironmentsPhrase(problem.Environments),
                    "the app does not start there",
                    "Add one without env, or one for each of those environments"
                );
            }
        }

        ReportUnknownEnvironments(context, taskId, config, configName);
    }

    /// <summary>
    /// Mirrors <c>AltinnPaymentConfiguration.Validate</c>, which runs at startup in every environment, but reports both
    /// settings where it stops at the first. A missing paymentConfig reads as an empty one (AltinnTaskExtension).
    /// </summary>
    private static void CheckPayment(Context context, XElement task, string taskId, XElement taskExtension)
    {
        const string configName = "paymentConfig";
        var config = taskExtension.Element(ProcessFile.Altinn + configName);
        RequireValue(
            context,
            config ?? task,
            taskId,
            config,
            configName,
            "paymentDataType",
            "the app does not start",
            "the app does not start",
            "Name the data type that stores the payment information"
        );
        RequireValue(
            context,
            config ?? task,
            taskId,
            config,
            configName,
            "paymentReceiptPdfDataType",
            "the app does not start",
            "the app does not start",
            "Name the data type that stores the payment receipt"
        );
    }

    /// <summary>
    /// Mirrors the startup check <c>SubformPdfServiceTask.ValidateConfiguration</c>, which requires
    /// <c>altinn:subformPdfConfig</c> and runs <c>AltinnSubformPdfConfiguration.Validate</c> on it, but reports both
    /// settings where it stops at the first. ALTINNAPP1013 reports a data type id that names no data type.
    /// </summary>
    private static void CheckSubformPdf(Context context, XElement task, string taskId, XElement taskExtension)
    {
        const string configName = "subformPdfConfig";
        const string consequence = "the app does not start";
        var config = taskExtension.Element(ProcessFile.Altinn + configName);
        if (config is null)
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                task,
                taskId,
                $"has no {Tag(configName)}",
                consequence,
                $"Add it, with {Tag("subformComponentId")} and {Tag("subformDataTypeId")}"
            );
            return;
        }

        RequireValue(
            context,
            config,
            taskId,
            config,
            configName,
            "subformComponentId",
            consequence,
            consequence,
            "Set it to the id of the Subform component to render"
        );
        RequireValue(
            context,
            config,
            taskId,
            config,
            configName,
            "subformDataTypeId",
            consequence,
            consequence,
            "Set it to the data type the subform stores its entries in"
        );
    }

    /// <summary>
    /// Mirrors <c>EFormidlingServiceTask.ValidateConfiguration</c>, which startup runs in every environment for the
    /// environment the app runs in, so this resolves every setting for each environment. It validates the settings
    /// before it looks at whether eFormidling is disabled, so they are required where it is disabled as well.
    /// </summary>
    private static void CheckEFormidling(Context context, XElement task, string taskId, XElement taskExtension)
    {
        const string configName = "eFormidlingConfig";
        var config = taskExtension.Element(ProcessFile.Altinn + configName);
        if (config is null)
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                task,
                taskId,
                $"has no {Tag(configName)}",
                "the app does not start",
                "Add it, with the settings of the shipment"
            );
            return;
        }

        var disabled = config.Elements(ProcessFile.Altinn + "disabled").ToList();
        var disabledIn = new HashSet<string>(
            HostingEnvironments.All.Where(env =>
                HostingEnvironments.Resolve(disabled, env) is { } entry
                && bool.TryParse(entry.Value, out var value)
                && value
            ),
            StringComparer.Ordinal
        );

        foreach (var name in _eFormidlingRequired)
        {
            ReportEFormidlingProblems(context, taskId, config, name, disabledIn, required: true);
        }

        ReportEFormidlingProblems(
            context,
            taskId,
            config,
            "securityLevel",
            disabledIn,
            required: true,
            new Format(
                value => int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out _),
                "a whole number",
                "Use a whole number, such as 3"
            )
        );

        // A blank value means enabled; only a value that is not a boolean fails.
        ReportEFormidlingProblems(
            context,
            taskId,
            config,
            "disabled",
            disabledIn,
            required: false,
            new Format(value => bool.TryParse(value, out _), "true or false", "Use true or false")
        );

        ReportUnknownEnvironments(context, taskId, config, configName);
    }

    /// <summary>
    /// Reports the environments where the eFormidling setting <paramref name="name"/> fails: where it is missing or
    /// blank, when <paramref name="required"/>, and where its value does not have the <paramref name="format"/>.
    /// </summary>
    private static void ReportEFormidlingProblems(
        Context context,
        string taskId,
        XElement config,
        string name,
        HashSet<string> disabledIn,
        bool required,
        Format? format = null
    )
    {
        var entries = config.Elements(ProcessFile.Altinn + name).ToList();
        foreach (var problem in FindProblems(entries, HostingEnvironments.All, required, format?.IsValid))
        {
            ReportEnvironmentProblem(context, taskId, config, name, problem, disabledIn, format);
        }
    }

    /// <summary>
    /// Reports the setting <paramref name="name"/> under <paramref name="config"/> where the entry that applies is
    /// missing, blank, or not in its <paramref name="format"/>, which only a value that is not blank can fail.
    /// </summary>
    private static void ReportEnvironmentProblem(
        Context context,
        string taskId,
        XElement config,
        string name,
        EnvironmentProblem problem,
        HashSet<string> disabledIn,
        Format? format
    )
    {
        // Every environment at once needs no names.
        var everywhere = problem.Environments.Count == HostingEnvironments.All.Length;
        var environments = everywhere ? "" : " " + EnvironmentsPhrase(problem.Environments);
        var path = Path(config.Name.LocalName, name);
        var (what, fix) = problem.Element switch
        {
            null => (
                $"has no {path}{environments}",
                everywhere ? "Add it" : "Add one without env, or one for each of those environments"
            ),
            // FindProblems reports an entry that is not blank only for failing the format.
            var entry when format is not null && !IsBlank(entry) => (
                $"has '{entry.Value}' in {path}{environments}, which is not {format.Expected}",
                format.Fix
            ),
            _ => ($"has an empty {path}{environments}", "Fill it in"),
        };

        if (problem.Environments.Exists(disabledIn.Contains))
        {
            fix += ". The app requires it even where eFormidling is disabled";
        }

        context.Report(
            Diagnostics.Process.TaskSettingInvalid,
            problem.Element ?? config,
            taskId,
            what,
            everywhere ? "the app does not start" : "the app does not start there",
            fix
        );
    }

    /// <summary>
    /// Reports <paramref name="name"/> under <paramref name="config"/> when it is absent or blank, as the runtime's
    /// checks with <c>string.IsNullOrWhiteSpace</c> (or for null, after which an empty value fails where it is used).
    /// </summary>
    private static void RequireValue(
        Context context,
        XElement anchor,
        string taskId,
        XElement? config,
        string configName,
        string name,
        string missingConsequence,
        string blankConsequence,
        string fix
    )
    {
        var element = config?.Element(ProcessFile.Altinn + name);
        if (element is null)
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                anchor,
                taskId,
                $"has no {Path(configName, name)}",
                missingConsequence,
                fix
            );
        }
        else if (IsBlank(element))
        {
            context.Report(
                Diagnostics.Process.TaskSettingInvalid,
                element,
                taskId,
                $"has an empty {Path(configName, name)}",
                blankConsequence,
                fix
            );
        }
    }

    /// <summary>
    /// The environments in which the entry that applies (<see cref="HostingEnvironments.Resolve"/>) fails: is missing or
    /// blank, when <paramref name="required"/>, or fails <paramref name="isValid"/>. They are grouped by that entry, so
    /// each can carry its own diagnostic.
    /// </summary>
    private static List<EnvironmentProblem> FindProblems(
        List<XElement> entries,
        IEnumerable<string> environments,
        bool required,
        Func<string, bool>? isValid = null
    )
    {
        var problems = new List<EnvironmentProblem>();
        foreach (var environment in environments)
        {
            var entry = HostingEnvironments.Resolve(entries, environment);
            var fails = entry is null || IsBlank(entry) ? required : isValid is not null && !isValid(entry.Value);
            if (!fails)
            {
                continue;
            }

            if (problems.Find(p => p.Element == entry) is { } existing)
            {
                existing.Environments.Add(environment);
            }
            else
            {
                problems.Add(new EnvironmentProblem(entry, [environment]));
            }
        }

        return problems;
    }

    /// <summary>
    /// Reports an <c>env</c> attribute the runtime cannot use on the entries under <paramref name="config"/> that take
    /// one: a name it maps to no environment the app is deployed to (AltinnEnvironments), and an attribute it does not
    /// read, because <c>AltinnEnvironmentConfig</c> binds only an unqualified, lowercase <c>env</c>. An entry without a
    /// readable <c>env</c> applies in every environment.
    /// </summary>
    private static void ReportUnknownEnvironments(Context context, string taskId, XElement config, string configName)
    {
        var schema = TaskConfigurationSchema.TaskExtension.Find(configName);
        foreach (var entry in config.Elements())
        {
            if (
                entry.Name.Namespace != ProcessFile.Altinn
                || schema?.Find(entry.Name.LocalName) is not { HasEnvironment: true }
            )
            {
                continue;
            }

            var path = Path(configName, entry.Name.LocalName);
            var env = entry.Attribute(HostingEnvironments.EnvAttribute);
            if (env is not null)
            {
                if (string.IsNullOrWhiteSpace(env.Value) || HostingEnvironments.Map(env.Value) is not null)
                {
                    continue;
                }

                var trimmed = env.Value.Trim();
                context.Report(
                    Diagnostics.Process.UnusableEnvironmentAttribute,
                    entry,
                    taskId,
                    $"env=\"{env.Value}\"",
                    path,
                    "which is not an environment name the app recognizes, so the entry applies in none of "
                        + "Development, Staging and Production",
                    HostingEnvironments.Map(trimmed) is not null
                        ? $"Remove the spaces: env=\"{trimmed}\""
                        : "Use one of the names the app recognizes: "
                            + string.Join(", ", HostingEnvironments.All.SelectMany(e => HostingEnvironments.Names[e]))
                );
                continue;
            }

            // The exact env attribute is handled above, so this finds one the runtime ignores.
            if (HostingEnvironments.FindEnvLike(entry) is { } ignored)
            {
                context.Report(
                    Diagnostics.Process.UnusableEnvironmentAttribute,
                    entry,
                    taskId,
                    $"{Written(entry, ignored.Name)}=\"{ignored.Value}\"",
                    path,
                    "which the app ignores, since it reads only an attribute named env, in lowercase and without a "
                        + "namespace prefix, so the entry applies in every environment",
                    $"Write it as env=\"{ignored.Value}\""
                );
            }
        }
    }

    /// <summary>
    /// Reports the children of <paramref name="parent"/> that the runtime skips, and looks inside those it reads: an
    /// element in the Altinn namespace that it does not read there, one it reads in another namespace, and every
    /// occurrence after the first of one that holds a single value. Other elements in other namespaces belong to
    /// other tools.
    /// </summary>
    private static void ReportIgnoredElements(
        Context context,
        string taskId,
        XElement parent,
        TaskConfigElement schema,
        string path
    )
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var element in parent.Elements())
        {
            var name = element.Name.LocalName;
            var known = schema.Find(name);
            if (element.Name.Namespace != ProcessFile.Altinn)
            {
                if (known is not null)
                {
                    context.Report(
                        Diagnostics.Process.TaskConfigurationElementIgnored,
                        element,
                        taskId,
                        $"<{Written(element, element.Name)}>",
                        path,
                        $"the app ignores, since it reads it only in the namespace '{ProcessFile.Altinn.NamespaceName}'",
                        $"Write it as {Tag(name)}"
                    );
                }

                continue;
            }

            if (known is null)
            {
                var match = schema.Children.FirstOrDefault(c =>
                    string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase)
                );
                context.Report(
                    Diagnostics.Process.TaskConfigurationElementIgnored,
                    element,
                    taskId,
                    Tag(name),
                    path,
                    "the app does not read, so the setting has no effect",
                    match is not null
                        ? $"Rename it to {Tag(match.Name)}"
                        : "Remove it, or use one of the elements the app reads there: "
                            + string.Join(", ", schema.Children.Select(c => Tag(c.Name)))
                );
            }
            else if (!known.Repeated && !seen.Add(name))
            {
                context.Report(
                    Diagnostics.Process.TaskConfigurationElementIgnored,
                    element,
                    taskId,
                    $"another {Tag(name)}",
                    path,
                    "the app ignores, since it reads only the first",
                    "Keep only one of them"
                );
            }
            else
            {
                // Messages name a configuration from its own element, the way ALTINNAPP1013 does.
                var elementPath = schema == TaskConfigurationSchema.TaskExtension ? Tag(name) : path + Tag(name);
                if (!known.HasEnvironment)
                {
                    ReportIgnoredEnvironment(context, taskId, element, schema, elementPath);
                }

                if (known.Children.Length > 0)
                {
                    ReportIgnoredElements(context, taskId, element, known, elementPath);
                }
            }
        }
    }

    /// <summary>
    /// Reports an <c>env</c> attribute on an element that does not take one, in any case or namespace. XmlSerializer
    /// skips it, so the element applies in every environment. Only <c>AltinnEnvironmentConfig</c> entries and the
    /// eFormidling <c>dataTypes</c> lists bind <c>env</c>; putting it on the entries of such a list is the usual slip.
    /// </summary>
    private static void ReportIgnoredEnvironment(
        Context context,
        string taskId,
        XElement element,
        TaskConfigElement parent,
        string elementPath
    )
    {
        if (HostingEnvironments.FindEnvLike(element) is not { } env)
        {
            return;
        }

        context.Report(
            Diagnostics.Process.UnusableEnvironmentAttribute,
            element,
            taskId,
            $"{Written(element, env.Name)}=\"{env.Value}\"",
            elementPath,
            $"which the app ignores, since {Tag(element.Name.LocalName)} does not take an env attribute, so the "
                + "setting applies in every environment",
            parent.HasEnvironment
                ? $"Move env to the {Tag(parent.Name)} that holds it, with one {Tag(parent.Name)} per environment"
                : "Remove it"
        );
    }

    private static bool IsBlank(XElement element) => string.IsNullOrWhiteSpace(element.Value);

    private static string Tag(string name) => ProcessFile.Tag(name);

    /// <summary>How a message names an element in a task's configuration, from <c>altinn:taskExtension</c>.</summary>
    private static string Path(string configName, string name) => Tag(configName) + Tag(name);

    /// <summary>An element or attribute name as written, with the prefix the document gives its namespace.</summary>
    private static string Written(XElement element, XName name)
    {
        var prefix = name.Namespace == XNamespace.None ? null : element.GetPrefixOfNamespace(name.Namespace);
        return prefix is null ? name.LocalName : $"{prefix}:{name.LocalName}";
    }

    /// <summary>"for the Staging environment", or "for the Staging and Production environments".</summary>
    private static string EnvironmentsPhrase(List<string> environments)
    {
        var names =
            environments.Count == 1
                ? environments[0]
                : string.Join(", ", environments.Take(environments.Count - 1))
                    + " and "
                    + environments[environments.Count - 1];
        return $"for the {names} environment{(environments.Count == 1 ? "" : "s")}";
    }

    /// <summary>The format a setting's value must have.</summary>
    /// <param name="IsValid">Whether a value that is not blank has the format, as the runtime parses it.</param>
    /// <param name="Expected">The format, for a message: "a whole number".</param>
    /// <param name="Fix">How to fix a value that does not have it.</param>
    private sealed record Format(Func<string, bool> IsValid, string Expected, string Fix);

    /// <summary>A setting that fails in the environments where its entry, or no entry, applies.</summary>
    /// <param name="Element">The entry that applies, or null when none does.</param>
    /// <param name="Environments">The environments, in the order of <see cref="HostingEnvironments.All"/>.</param>
    private sealed record EnvironmentProblem(XElement? Element, List<string> Environments);

    private sealed class Context(AdditionalText processFile, string processContent, List<Diagnostic> diagnostics)
    {
        /// <summary>Reports a diagnostic on the opening tag of a process.bpmn element.</summary>
        internal void Report(DiagnosticDescriptor descriptor, XElement element, params object[] args) =>
            diagnostics.Add(
                Diagnostic.Create(
                    descriptor,
                    FileLocationHelper.GetXmlElementLocation(processFile, processContent, element),
                    args
                )
            );
    }
}
