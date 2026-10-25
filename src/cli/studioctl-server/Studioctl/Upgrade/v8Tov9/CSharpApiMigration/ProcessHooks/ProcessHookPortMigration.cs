using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// Moves the app's v8 process hooks to the v9 handlers: <c>IProcessTaskStart</c>, <c>IProcessTaskEnd</c>,
/// <c>IProcessTaskAbandon</c> and <c>IProcessEnd</c> implementations to <c>IOnTaskStartingHandler</c>,
/// <c>IOnTaskEndingHandler</c>, <c>IOnTaskAbandoningHandler</c> and <c>IOnProcessEndedHandler</c>, with a task filter
/// and their registrations, combining handlers that v9 would refuse side by side; and a custom <c>IProcessTask</c>'s
/// methods to the context v9 calls them with.
/// </summary>
/// <remarks>
/// <p>The Storage calls of the code a moved hook runs go to the instance data mutator (<see cref="StorageCallPort"/>),
/// as do those of <c>IInstantiationProcessor.DataCreation</c> and v8 service tasks: v9 refuses direct writes while
/// the process is transitioning. The removed-API check lists what is left. A hook the port cannot move gets a to-do
/// saying why.</p>
/// <p>Binds against the app's v8 compilation, so it runs before any rewrite that moves names the compilation knows,
/// and does nothing without one. Everything is found before anything is written; each file is then written once.</p>
/// </remarks>
internal sealed class ProcessHookPortMigration(CSharpSourceScanner scanner, ProcessHookPortContext context)
{
    public MigrationResult Migrate(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        // Snapshot: Update replaces list entries, which would invalidate a live enumerator.
        var files = scanner.Files.ToArray();
        if (
            files.Select(static file => file.SemanticModel).OfType<SemanticModel>().FirstOrDefault() is not { } anyModel
        )
        {
            return new MigrationResult();
        }

        var compilation = anyModel.Compilation;
        var calls = AppCalls(files);
        var edits = new PortEdits();
        var reports = new List<PortReport>();
        var registrations = HookRegistrations.Find(files, HookFamily.RemovedHooks);
        var candidates = TaskHookPort.Find(files, calls).Concat(ProcessEndedPort.Find(files, calls)).ToList();
        cancellationToken.ThrowIfCancellationRequested();
        var plans = Plans(candidates, registrations, files, compilation);
        var mergedInto = MergedInto(plans);
        if (MergedTwice(mergedInto) is { Count: > 0 } mergedTwice)
        {
            candidates =
            [
                .. candidates.Select(c =>
                    mergedTwice.GetValueOrDefault(c) is { } reason ? c with { BlockedBy = reason } : c
                ),
            ];
            plans = Plans(candidates, registrations, files, compilation);
            mergedInto = MergedInto(plans);
        }

        foreach (var candidate in candidates)
        {
            if (candidate.BlockedBy is { } reason)
            {
                reports.Add(
                    PortReport.Located(
                        candidate.Hook.File,
                        candidate.Hook.TypeDeclaration,
                        UpgradeMessageStatus.Todo,
                        NotPorted(candidate.Hook, reason)
                    )
                );
            }
        }

        var held = plans.SelectMany(static plan => plan.Held).ToHashSet();
        foreach (var plan in plans)
        {
            reports.AddRange(plan.Reports);
            foreach (var group in plan.Groups)
            {
                PlanComposite(group, edits);
            }

            foreach (var duplicate in plan.Duplicates)
            {
                var twice =
                    $"v9 does not start with two {duplicate.Family.V9InterfaceName} "
                    + $"{(duplicate.Family.FiltersTasks ? "for one task" : "registrations")}";
                if (duplicate.RemovableStatement is { } statement)
                {
                    edits.For(duplicate.File).RemoveLine(statement);
                    reports.Add(
                        PortReport.Located(
                            duplicate.File,
                            statement,
                            UpgradeMessageStatus.Warning,
                            $"removed this second registration of {duplicate.Implementation?.Name}, which v8 ran twice; "
                                + $"{twice}."
                        )
                    );
                }
                else
                {
                    reports.Add(
                        PortReport.Located(
                            duplicate.File,
                            duplicate.Invocation,
                            UpgradeMessageStatus.Todo,
                            $"this is a second registration of {duplicate.Implementation?.Name}, which v8 ran twice, "
                                + $"and {twice}. The upgrade removes only a registration that is a statement of its own in a "
                                + "block, so remove this one by hand."
                        )
                    );
                }
            }
        }

        var ported = candidates.Where(candidate => candidate.IsPortable && !held.Contains(candidate)).ToList();
        var storage = StorageCallPort.Plan(files, compilation, context, ported, calls, cancellationToken);
        reports.AddRange(storage.Reports);
        reports.AddRange(
            WindowReports.PackageHookTypes(
                registrations,
                ported
                    .Select(static candidate => (ITypeSymbol)candidate.Hook.Type)
                    .ToHashSet<ITypeSymbol>(SymbolEqualityComparer.Default),
                context
            )
        );
        foreach (var candidate in ported)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var handler = plans
                .SelectMany(static plan => plan.Handlers)
                .FirstOrDefault(handler => handler.Candidate == candidate);
            PlanPort(
                candidate,
                handler,
                mergedInto.GetValueOrDefault(candidate),
                // A class that implements more than one task hook needs a filter per interface.
                ported.Count(other =>
                    other.Hook.Family.FiltersTasks
                    && SymbolEqualityComparer.Default.Equals(other.Hook.Type, candidate.Hook.Type)
                ) > 1,
                edits,
                reports,
                storage
            );
        }

        ProcessTaskPort.Plan(files, calls, edits, reports, storage);
        storage.Apply(edits);

        edits.Apply(scanner);
        return new MigrationResult([
            .. reports
                .OrderBy(static report => report.Path, StringComparer.Ordinal)
                .ThenBy(static report => report.Line)
                .Select(static report => report.Message),
        ]);
    }

    private List<MergePlan> Plans(
        IReadOnlyList<HookCandidate> candidates,
        IReadOnlyList<HookRegistration> registrations,
        IReadOnlyList<ScannedCSharpFile> files,
        Compilation compilation
    ) =>
        [
            .. HookFamily.RemovedHooks.Select(family =>
                HandlerMerge.Plan(family, candidates, registrations, files, compilation, context)
            ),
        ];

    private static Dictionary<HookCandidate, MergeGroup> MergedInto(IReadOnlyList<MergePlan> plans)
    {
        var mergedInto = new Dictionary<HookCandidate, MergeGroup>();
        foreach (var group in plans.SelectMany(static plan => plan.Groups))
        {
            foreach (var member in group.Members)
            {
                if (member.Candidate is { } candidate)
                {
                    mergedInto[candidate] = group;
                }
            }
        }

        return mergedInto;
    }

    /// <summary>
    /// The task hooks of classes that would be merged for more than one task hook, with why they are not ported: a
    /// merged class keeps its filter as a public <c>ShouldRunForTask</c>, which it can have only once.
    /// </summary>
    private Dictionary<HookCandidate, string> MergedTwice(Dictionary<HookCandidate, MergeGroup> mergedInto)
    {
        var reasons = new Dictionary<HookCandidate, string>();
        foreach (
            var merged in mergedInto
                .Where(static entry => entry.Key.Hook.Family.FiltersTasks)
                .GroupBy(static entry => entry.Key.Hook.Type, SymbolEqualityComparer.Default)
                .Where(static merged => merged.Count() > 1)
        )
        {
            var hooks = HandlerMerge.Join(merged.Select(static entry => entry.Key.Hook.Family.V8InterfaceName));
            foreach (var (candidate, group) in merged)
            {
                var members = group.Members.Where(member => member.Candidate != candidate).ToList();
                reasons[candidate] =
                    $"v8 ran it together with {HandlerMerge.Join(members.Select(static member => member.Type.Name))} "
                    + $"at {HandlerMerge.SharedTasks(group.Members, context)}, and the upgrade combines only one of "
                    + $"a class's task hooks ({hooks}) with other classes";
            }
        }

        return reasons;
    }

    /// <summary>
    /// The hook in its v9 shape: the method, its filter, its base list entry, and its registrations, unless a merged
    /// class runs it.
    /// </summary>
    private static void PlanPort(
        HookCandidate candidate,
        Handler? handler,
        MergeGroup? group,
        bool explicitFilter,
        PortEdits edits,
        List<PortReport> reports,
        StorageCallPort storage
    )
    {
        var hook = candidate.Hook;
        if (hook.Declaration is not { } method || hook.V8BaseType is not { } baseType)
        {
            throw new InvalidOperationException("A portable hook is declared in the app and names the interface.");
        }

        var family = hook.Family;
        var file = edits.For(hook.File);
        var ported = storage.Port(
            hook,
            candidate.Tasks,
            explicitFilter,
            asPublicMethod: group is not null,
            SyntaxEditing.LineEnding(hook.File.Root)
        );
        if (ported.PrecedingMember is { } filter)
        {
            file.InsertBefore(method, filter);
        }

        file.Replace(method, ported.Rewritten);
        if (group is null)
        {
            file.Replace(
                baseType,
                SyntaxFactory
                    .SimpleBaseType(GeneratedTypeReferenceFinalizer.Reference(family.V9Interface))
                    .WithTriviaFrom(baseType)
            );
            reports.Add(
                PortReport.Located(
                    hook.File,
                    hook.TypeDeclaration,
                    UpgradeMessageStatus.Warning,
                    $"{hook.Type.Name} now implements {family.V9InterfaceName}. {HookMethodPort.RunsAgain}"
                )
            );
        }
        else
        {
            // Found by its syntax rather than its position: another merged hook's entry may be gone already.
            file.Replace(
                hook.TypeDeclaration,
                current =>
                    current is TypeDeclarationSyntax { BaseList.Types: var types } type
                    && types.FirstOrDefault(entry => entry.IsEquivalentTo(baseType)) is { } remaining
                        ? HandlerMerge.WithoutBaseType(type, remaining)
                        : current
            );
            reports.Add(
                PortReport.Located(
                    hook.File,
                    hook.TypeDeclaration,
                    UpgradeMessageStatus.Warning,
                    $"{hook.Type.Name} now has the methods of {family.V9InterfaceName}, which {group.CompositeName} "
                        + $"calls. {HookMethodPort.RunsAgain}"
                )
            );
        }

        foreach (var thrown in HookMethodPort.Throws(method))
        {
            reports.Add(
                PortReport.Located(
                    hook.File,
                    thrown,
                    UpgradeMessageStatus.Warning,
                    $"{hook.Type.Name} throws here, and v9 retries a hook that throws, so the process transition is "
                        + "tried again. If trying again cannot help, return HandlerResult.FailedPermanent(message) instead."
                )
            );
        }

        if (handler is null)
        {
            reports.Add(
                PortReport.Located(
                    hook.File,
                    hook.TypeDeclaration,
                    UpgradeMessageStatus.Info,
                    $"{hook.Type.Name} is not registered; v8 never ran it."
                )
            );
            return;
        }

        if (group is not null)
        {
            return;
        }

        var registration = handler.Registrations[0];
        var registrationEdits = edits.For(registration.File);
        registrationEdits.Replace(registration.Invocation, HookRegistrations.Retarget(registration));
        reports.Add(
            PortReport.Located(
                registration.File,
                registration.Invocation,
                UpgradeMessageStatus.Warning,
                $"registered {hook.Type.Name} as {family.V9InterfaceName}."
            )
        );
    }

    /// <summary>
    /// The generated class's file, its registration after the last of the classes it runs, and those classes
    /// registered as themselves.
    /// </summary>
    private static void PlanComposite(MergeGroup group, PortEdits edits)
    {
        var first = group.Members[0].Registrations[0];
        edits.Add(group.Path, HandlerMerge.CompositeFile(group, SyntaxEditing.LineEnding(first.File.Root)));
        var registrations = group.Members.Select(static member => member.Registrations[0]).ToList();
        foreach (var registration in registrations)
        {
            edits
                .For(registration.File)
                .Replace(registration.Invocation, HookRegistrations.WithoutServiceType(registration));
        }

        var last = registrations.MaxBy(static registration => registration.Invocation.SpanStart) ?? first;
        edits
            .For(last.File)
            .InsertAfter(
                last.Statement ?? throw new InvalidOperationException("Merged classes are registered by statements."),
                HandlerMerge.CompositeRegistration(group, last, SyntaxEditing.LineEnding(last.File.Root))
            );
    }

    private static string NotPorted(HookImplementation hook, string reason)
    {
        var family = hook.Family;
        var members = family.FiltersTasks ? "ShouldRunForTask(taskId) and Execute(context)" : "Execute(context)";
        return $"{hook.Type.Name} implements {family.V8InterfaceName}, which v9 removed, and was not ported: {reason}. "
            + $"Move the code to {family.V9InterfaceName}: {members}, with instance data from "
            + "context.InstanceDataMutator.";
    }

    /// <summary>Where the app calls each of its own methods, the first call of each.</summary>
    private static Dictionary<IMethodSymbol, string> AppCalls(IReadOnlyList<ScannedCSharpFile> files)
    {
        var calls = new Dictionary<IMethodSymbol, string>(SymbolEqualityComparer.Default);
        foreach (var file in files)
        {
            if (file.SemanticModel is not { } model)
            {
                continue;
            }

            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                if (model.GetSymbolInfo(invocation).Symbol is IMethodSymbol method)
                {
                    calls.TryAdd(
                        (method.ReducedFrom ?? method).OriginalDefinition,
                        $"{PortReport.DisplayPath(file.RelativePath)}:{file.GetLine(invocation)}"
                    );
                }
            }
        }

        return calls;
    }
}

/// <summary>
/// A v8 hook the app implements, and whether the port moves it: not when something blocks it
/// (<see cref="BlockedBy"/>, which is reported).
/// </summary>
/// <param name="Tasks">The tasks the hook does anything for, for a family with a task filter.</param>
internal sealed record HookCandidate(HookImplementation Hook, string? BlockedBy, TaskIds Tasks)
{
    public bool IsPortable => BlockedBy is null;

    public static HookCandidate Blocked(HookImplementation hook, string reason) => new(hook, reason, TaskIds.Every);

    /// <summary>Why the hook cannot be moved, the base list entry it needs included; <c>null</c> when it can.</summary>
    public static string? BlockingReason(HookImplementation hook, IReadOnlyDictionary<IMethodSymbol, string> calls) =>
        HookMethodPort.BlockingReason(hook, calls)
        ?? (
            hook.V8BaseType is null
                ? $"it gets {hook.Family.V8InterfaceName} from another type, which must change with it"
                : null
        );
}

/// <summary>A message of the port, with the place it is about, by which the messages are sorted.</summary>
internal sealed record PortReport(string Path, int Line, UpgradeMessage Message)
{
    /// <summary>A message about <paramref name="node"/>, starting with its path and line.</summary>
    public static PortReport Located(ScannedCSharpFile file, SyntaxNode node, UpgradeMessageStatus status, string text)
    {
        var path = DisplayPath(file.RelativePath);
        var line = file.GetLine(node);
        return new(path, line, new UpgradeMessage($"{path}:{line}: {text}", status));
    }

    /// <summary>A message sorted at <paramref name="node"/> whose text says where it is about itself.</summary>
    public static PortReport Anchored(
        ScannedCSharpFile file,
        SyntaxNode node,
        UpgradeMessageStatus status,
        string text
    ) => new(DisplayPath(file.RelativePath), file.GetLine(node), new UpgradeMessage(text, status));

    /// <summary>A relative path as the reports show it, with <c>/</c> between folders on every OS.</summary>
    public static string DisplayPath(string relativePath) => relativePath.Replace('\\', '/');
}

/// <summary>The port's edits of every file, and the files it adds, applied once everything is planned.</summary>
internal sealed class PortEdits
{
    private readonly Dictionary<ScannedCSharpFile, FileEdits> _files = [];
    private readonly List<(string Path, CompilationUnitSyntax Root)> _added = [];

    public FileEdits For(ScannedCSharpFile file)
    {
        if (!_files.TryGetValue(file, out var edits))
        {
            _files[file] = edits = new FileEdits();
        }

        return edits;
    }

    public void Add(string path, CompilationUnitSyntax root) => _added.Add((path, root));

    public void Apply(CSharpSourceScanner scanner)
    {
        foreach (var (file, edits) in _files)
        {
            scanner.Update(file, edits.Apply(file.Root));
        }

        foreach (var (path, root) in _added)
        {
            scanner.Add(path, root);
        }
    }
}

/// <summary>
/// The edits of one file, made on the nodes of its tree as it was when they were planned: insertions, then
/// replacements from the innermost out (a replacement that takes the current node sees what is inside it already
/// edited), then removals of whole lines.
/// </summary>
internal sealed class FileEdits
{
    private readonly List<(SyntaxNode Target, Func<SyntaxNode, SyntaxNode> Replace)> _replacements = [];
    private readonly List<(SyntaxNode Target, SyntaxNode Node)> _before = [];
    private readonly List<(SyntaxNode Target, SyntaxNode Node)> _after = [];
    private readonly List<SyntaxNode> _removals = [];

    public void Replace(SyntaxNode target, SyntaxNode replacement) => _replacements.Add((target, _ => replacement));

    public void Replace(SyntaxNode target, Func<SyntaxNode, SyntaxNode> replace) =>
        _replacements.Add((target, replace));

    public void InsertBefore(SyntaxNode target, SyntaxNode node) => _before.Add((target, node));

    public void InsertAfter(SyntaxNode target, SyntaxNode node) => _after.Add((target, node));

    public void RemoveLine(SyntaxNode target) => _removals.Add(target);

    public CompilationUnitSyntax Apply(CompilationUnitSyntax root)
    {
        var targets = _replacements
            .Select(static edit => edit.Target)
            .Concat(_before.Select(static edit => edit.Target))
            .Concat(_after.Select(static edit => edit.Target))
            .Concat(_removals)
            .Distinct()
            .ToList();
        root = root.TrackNodes(targets);
        foreach (var (target, node) in _before)
        {
            root = root.InsertNodesBefore(Current(root, target), [node]);
        }

        foreach (var (target, node) in _after)
        {
            root = root.InsertNodesAfter(Current(root, target), [node]);
        }

        foreach (
            var (target, replace) in _replacements.OrderByDescending(static edit => edit.Target.Ancestors().Count())
        )
        {
            var current = Current(root, target);
            root = root.ReplaceNode(current, replace(current));
        }

        return _removals.Count == 0
            ? root
            : SyntaxEditing.RemoveLines(root, [.. _removals.Select(target => Current(root, target))]);
    }

    private static SyntaxNode Current(CompilationUnitSyntax root, SyntaxNode target) =>
        root.GetCurrentNode(target) ?? throw new InvalidOperationException("Lost track of a node to edit.");
}
