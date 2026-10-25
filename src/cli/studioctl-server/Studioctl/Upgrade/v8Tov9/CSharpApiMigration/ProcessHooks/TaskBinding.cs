using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>The tasks that can be the process's current task while code of the transition runs.</summary>
/// <param name="Tasks">The tasks that can be current.</param>
/// <param name="AfterEnd">Whether the code also runs when the process has ended, when no task is current.</param>
/// <param name="ServiceTasks">The tasks among <paramref name="Tasks"/> that are service tasks, which have no users.</param>
internal sealed record CurrentTasks(IReadOnlyList<string> Tasks, bool AfterEnd, IReadOnlySet<string> ServiceTasks);

/// <summary>
/// The rule v9's Storage and localtest apply to data element writes: an element of a data type with <c>taskIds</c>
/// may be created, changed or deleted only while one of those tasks is current, in a process transition too; after
/// the process ended only the delete of an <c>autoDeleteOnProcessEnd</c> type passes. The current task follows from
/// the entry: task end and abandon run in the task being left, task start in the entered one, service tasks in their
/// own task, <c>DataCreation</c> at the start of each task that has an <c>autoCreate</c> data type and process end in
/// none.
/// </summary>
internal sealed class TaskBinding(ProcessHookPortContext context, WindowReach reach)
{
    /// <summary>The task types v9 runs as service tasks itself.</summary>
    private static readonly HashSet<string> _serviceTaskTypes = ["pdf", "subformPdf", "eFormidling", "fiksArkiv"];

    private readonly Dictionary<IMethodSymbol, Func<SyntaxNode, TaskIds>> _reached = new(
        SymbolEqualityComparer.Default
    );

    /// <summary>
    /// The tasks that can be current when <paramref name="node"/> in <paramref name="rewrite"/>'s method runs, from
    /// every entry that reaches it; <c>null</c> when that cannot be told for one of them.
    /// </summary>
    public CurrentTasks? At(MethodRewrite rewrite, SyntaxNode node)
    {
        var tasks = new List<string>();
        var afterEnd = false;
        var serviceTasks = new HashSet<string>(StringComparer.Ordinal);
        foreach (var entry in rewrite.Entries)
        {
            if (entry.Hook?.Family == HookFamily.ProcessEnded)
            {
                afterEnd = true;
                continue;
            }

            var entered = entry.Kind switch
            {
                WindowEntryKind.Hook or WindowEntryKind.ProcessTask => TaskIdsAt(entry, rewrite.Method, node),
                WindowEntryKind.DataCreation => AutoCreateTasks(),
                _ => ServiceTaskTasks(entry),
            };
            if (entered is null)
            {
                return null;
            }

            if (entry.Kind == WindowEntryKind.ServiceTask)
            {
                serviceTasks.UnionWith(entered);
            }

            tasks.AddRange(entered.Where(task => !tasks.Contains(task)));
        }

        serviceTasks.UnionWith(
            tasks.Where(task =>
                context.BpmnTaskTypes.TryGetValue(task, out var type) && _serviceTaskTypes.Contains(type)
            )
        );
        return new CurrentTasks(tasks, afterEnd, serviceTasks);
    }

    /// <summary>The data types whose form is of class <paramref name="form"/>.</summary>
    public IReadOnlyList<string> FormDataTypes(ITypeSymbol form) =>
        [
            .. context
                .DataTypes.Values.Where(dataType => dataType.ClassRef == form.ToDisplayString())
                .Select(static dataType => dataType.Id)
                .Order(StringComparer.Ordinal),
        ];

    /// <summary>
    /// The to-do for a write of an element of one of <paramref name="dataTypes"/> that v9 refuses wherever it runs;
    /// <c>null</c> when one of them is unbound, or lists a task the write can run at, or a delete passes at the end.
    /// </summary>
    /// <param name="member">The client member, as reports name it.</param>
    public string? Refusal(string member, IReadOnlyList<string> dataTypes, CurrentTasks current, WriteKind kind)
    {
        var bound = new List<DataTypeInfo>();
        foreach (var id in dataTypes)
        {
            if (
                !context.DataTypes.TryGetValue(id, out var dataType)
                || dataType.TaskIds.Count == 0
                || current.Tasks.Any(dataType.TaskIds.Contains)
                || current.AfterEnd && kind == WriteKind.Delete && dataType.AutoDeleteOnProcessEnd
            )
            {
                return null;
            }

            bound.Add(dataType);
        }

        if (bound.Count == 0 || current.Tasks.Count == 0 && !current.AfterEnd)
        {
            return null;
        }

        var names = Or([.. bound.Select(static dataType => dataType.Id)]);
        var taskIds = bound.SelectMany(static dataType => dataType.TaskIds).Distinct(StringComparer.Ordinal).ToList();
        var verb = kind == WriteKind.Delete ? "deletes" : "writes";
        if (current.Tasks.Count == 0)
        {
            return $"{member} {verb} {names} at process end, when there is no current task; v9 refuses that for "
                + $"{TypesBound(bound.Count)} to {And(taskIds)}. "
                + (
                    kind == WriteKind.Delete
                        ? $"Set autoDeleteOnProcessEnd on {names} so that v9 deletes it when the process ends instead."
                        : $"Make the write at the end of {Or(taskIds)} instead."
                );
        }

        var refusal =
            $"{member} {verb} {names}, which is bound to {And(taskIds)}, while {Or(current.Tasks)} is the current "
            + "task. v9 refuses data element writes outside the type's tasks, in process transitions too. Make the write "
            + $"in a hook of {Or(taskIds)}, move the value to a data type bound to {And(current.Tasks)} (or one with no "
            + $"taskIds), or add {And(current.Tasks)} to {names}'s taskIds.";
        var pdf = bound.Any(static dataType => dataType.ClassRef is not null && dataType.EnablePdfCreation);
        return refusal + Consequences(current, pdf);
    }

    /// <summary>
    /// The to-do for a write of an element whose data type the code does not tell and which the same method unlocks
    /// first, so that the element is locked where the write runs.
    /// </summary>
    public static string UnknownTypeRefusal(string member, WriteKind kind) =>
        $"{member} {(kind == WriteKind.Delete ? "deletes" : "writes")} an element whose data type the upgrade could "
        + "not tell. The method unlocks it first, so it belongs to another task: v9 unlocks a task's data when the "
        + "task starts and locks it after the task-end handlers, and refuses data element writes outside the type's "
        + "tasks, in process transitions too. Make the write in a hook of a task the type is bound to, move the value "
        + "to a data type bound to the task this code runs in (or one with no taskIds), or add that task to the "
        + "type's taskIds.";

    /// <summary>What adding the write's tasks to the type's <c>taskIds</c> also does, after a space.</summary>
    private static string Consequences(CurrentTasks current, bool pdf)
    {
        List<string> userTasks = [.. current.Tasks.Where(task => !current.ServiceTasks.Contains(task))];
        if (userTasks.Count == 0)
        {
            return "";
        }

        var userTask = Or(userTasks);
        return $" That last option lets users edit it in {userTask}"
            + (
                pdf
                    ? $", validates it at the end of {userTask} and adds it to that task's PDF."
                    : $" and validates it at the end of {userTask}."
            );
    }

    private static string TypesBound(int count) => count > 1 ? "types bound" : "a type bound";

    /// <summary>
    /// What a package's process-end hook does to the app's forms that are bound to tasks, which v9 refuses when no
    /// task is current; <c>null</c> when no form is bound.
    /// </summary>
    public static string? PackageRefusal(ProcessHookPortContext context, ProcessEndFormWrite write)
    {
        var forms = context
            .DataTypes.Values.Where(static dataType => dataType.ClassRef is not null && dataType.TaskIds.Count > 0)
            .OrderBy(static dataType => dataType.Id, StringComparer.Ordinal)
            .ToList();
        if (forms.Count == 0)
        {
            return null;
        }

        var names = And([.. forms.Select(static dataType => dataType.Id)]);
        var taskIds = forms.SelectMany(static dataType => dataType.TaskIds).Distinct(StringComparer.Ordinal).ToList();
        return $"{write.Member} {write.Does.Replace("{forms}", names, StringComparison.Ordinal)}; v9 refuses that for "
            + $"{TypesBound(forms.Count)} to {And(taskIds)}. "
            + write
                .Fix.Replace("{forms}", names, StringComparison.Ordinal)
                .Replace("{tasks}", Or(taskIds), StringComparison.Ordinal);
    }

    /// <summary>
    /// The values the hook's task id can have at <paramref name="node"/>: at the node itself in the hook, or at the
    /// hook's calls that lead to the helper it is in; <c>null</c> when the hook does not narrow them.
    /// </summary>
    private IReadOnlyList<string>? TaskIdsAt(WindowEntry entry, IMethodSymbol method, SyntaxNode node)
    {
        if (
            entry.Hook is not { } hook
            || hook.Family.V8Parameters.ToList().IndexOf(HookParameterRole.TaskId) is not (>= 0 and var index)
        )
        {
            return null;
        }

        if (!_reached.TryGetValue(entry.Method, out var reached))
        {
            _reached[entry.Method] = reached = TaskFilter.Reached(
                entry.Declaration,
                hook.Method.Parameters[index],
                hook.Model
            );
        }

        if (SymbolEqualityComparer.Default.Equals(method, entry.Method))
        {
            return reached(node).Ids;
        }

        var sites = CallsLeadingTo(entry.Method, method).ToList();
        IReadOnlyList<string>? ids = sites.Count > 0 ? [] : null;
        foreach (var site in sites)
        {
            if (ids is null || reached(site.Operation.Syntax).Ids is not { } siteIds)
            {
                return null;
            }

            ids = [.. ids, .. siteIds.Except(ids, StringComparer.Ordinal)];
        }

        return ids;
    }

    /// <summary>The calls in <paramref name="entry"/>'s own body through which it reaches <paramref name="method"/>.</summary>
    private IEnumerable<CallSite> CallsLeadingTo(IMethodSymbol entry, IMethodSymbol method) =>
        reach.CallsFrom(entry).Where(site => Reaches(site.Callee, method));

    private bool Reaches(IMethodSymbol from, IMethodSymbol to)
    {
        var seen = new HashSet<IMethodSymbol>(SymbolEqualityComparer.Default) { from };
        var pending = new Queue<(IMethodSymbol Method, int Depth)>([(from, 0)]);
        while (pending.TryDequeue(out var current))
        {
            if (SymbolEqualityComparer.Default.Equals(current.Method, to))
            {
                return true;
            }

            if (current.Depth >= WindowReach.MaxDepth)
            {
                continue;
            }

            foreach (var call in reach.CallsFrom(current.Method))
            {
                if (seen.Add(call.Callee))
                {
                    pending.Enqueue((call.Callee, current.Depth + 1));
                }
            }
        }

        return false;
    }

    /// <summary>
    /// The tasks whose <c>autoCreate</c> data types v9 creates when they start, with <c>DataCreation</c>; <c>null</c>
    /// when none.
    /// </summary>
    private List<string>? AutoCreateTasks()
    {
        List<string> tasks =
        [
            .. context
                .DataTypes.Values.Where(static dataType => dataType.AutoCreate)
                .SelectMany(static dataType => dataType.TaskIds)
                .Distinct(StringComparer.Ordinal)
                .Order(StringComparer.Ordinal),
        ];
        return tasks.Count > 0 ? tasks : null;
    }

    /// <summary>The tasks whose <c>altinn:taskType</c> is the service task's <c>Type</c>, a constant in its class.</summary>
    private IReadOnlyList<string>? ServiceTaskTasks(WindowEntry entry)
    {
        var type = entry
            .Method.ContainingType.GetMembers("Type")
            .OfType<IPropertySymbol>()
            .SelectMany(static property => property.DeclaringSyntaxReferences)
            .Select(static reference => reference.GetSyntax())
            .OfType<PropertyDeclarationSyntax>()
            .Select(property =>
                property.ExpressionBody?.Expression
                ?? property.Initializer?.Value
                ?? property
                    .AccessorList?.Accessors.FirstOrDefault(static accessor => accessor.Keyword.ValueText == "get")
                    ?.ExpressionBody?.Expression
            )
            .OfType<ExpressionSyntax>()
            .Select(expression =>
                reach.Compilation.GetSemanticModel(expression.SyntaxTree).GetConstantValue(expression).Value
            )
            .OfType<string>()
            .FirstOrDefault();
        List<string> tasks =
        [
            .. context
                .BpmnTaskTypes.Where(task => task.Value == type)
                .Select(static task => task.Key)
                .Order(StringComparer.Ordinal),
        ];
        return type is null || tasks.Count == 0 ? null : tasks;
    }

    private static string Or(IReadOnlyList<string> items) => Joined(items, "or");

    public static string And(IReadOnlyList<string> items) => Joined(items, "and");

    private static string Joined(IReadOnlyList<string> items, string conjunction) =>
        items.Count < 2 ? string.Concat(items) : $"{string.Join(", ", items.SkipLast(1))} {conjunction} {items[^1]}";
}

/// <summary>What a data element write does, which decides whether it passes after the process ended.</summary>
internal enum WriteKind
{
    /// <summary>Creates the element or changes its data or metadata.</summary>
    Write,

    /// <summary>Deletes the element.</summary>
    Delete,
}

/// <summary>A package's process-end hook that writes the app's forms.</summary>
/// <param name="Member">The hook member, as reports name it.</param>
/// <param name="Does">What it does to the forms, with <c>{forms}</c> for their ids.</param>
/// <param name="Fix">What the package owner does instead, with <c>{forms}</c> and <c>{tasks}</c> for their tasks.</param>
internal sealed record ProcessEndFormWrite(string Member, string Does, string Fix);
