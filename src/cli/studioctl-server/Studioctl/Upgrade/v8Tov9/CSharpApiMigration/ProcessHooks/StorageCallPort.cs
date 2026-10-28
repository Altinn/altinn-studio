using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// Moves the Storage calls of the code the v9 process transition runs to the instance data mutator: the ported hooks,
/// custom process tasks, <c>IInstantiationProcessor.DataCreation</c> and v8 service tasks, and the app's methods
/// only they call, which get the mutator as a parameter. Planned in full before anything is written; a hook's
/// rewritten body then goes through the hook port.
/// </summary>
internal sealed class StorageCallPort
{
    private const string MutatorType = "Altinn.App.Core.Features.IInstanceDataMutator";

    private readonly Dictionary<IMethodSymbol, MethodRewrite> _rewrites;
    private readonly Dictionary<IMethodSymbol, Threading> _threaded;

    private readonly IReadOnlyList<(IMethodSymbol Member, Threading Threading)> _interfaceEdits;
    private IReadOnlyList<UnusedClient> _unused = [];
    private readonly IReadOnlyList<ScannedCSharpFile> _files;

    private StorageCallPort(
        Dictionary<IMethodSymbol, MethodRewrite> rewrites,
        Dictionary<IMethodSymbol, Threading> threaded,
        IReadOnlyList<PortReport> reports,
        IReadOnlyList<(IMethodSymbol Member, Threading Threading)> interfaceEdits,
        IReadOnlyList<ScannedCSharpFile> files
    )
    {
        _interfaceEdits = interfaceEdits;
        _files = files;
        _rewrites = rewrites;
        _threaded = threaded;
        Reports = reports;
    }

    public IReadOnlyList<PortReport> Reports { get; }

    /// <summary>Plans every rewrite, for the hooks the port moves and the other entries the app has.</summary>
    public static StorageCallPort Plan(
        IReadOnlyList<ScannedCSharpFile> files,
        Compilation compilation,
        ProcessHookPortContext context,
        IReadOnlyList<HookCandidate> portedHooks,
        IReadOnlyDictionary<IMethodSymbol, string> appCalls,
        CancellationToken cancellationToken
    )
    {
        var reach = new WindowReach(compilation, files);
        var entries = new List<WindowEntry>();
        entries.AddRange(
            portedHooks
                .Where(static candidate => candidate.Hook.Declaration is not null)
                .Select(static candidate => HookEntry(candidate.Hook))
        );
        entries.AddRange(ProcessTasks(files, appCalls));
        var dataCreations = DataCreationPort.Find(files, context).ToList();
        var serviceTasks = ServiceTaskBodies.Find(files).ToList();
        var reports = new List<PortReport>();

        var tooDeep = new List<CallSite>();
        foreach (var dataCreation in dataCreations)
        {
            if (reach.Reach(dataCreation, []).Any(method => reach.StorageCalls(method.Method).Any()))
            {
                entries.Add(dataCreation);
            }
        }

        entries.AddRange(serviceTasks);
        var reached = new Dictionary<IMethodSymbol, List<ReachedMethod>>(SymbolEqualityComparer.Default);
        foreach (var entry in entries)
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var method in reach.Reach(entry, tooDeep))
            {
                if (!reached.TryGetValue(method.Method, out var ways))
                {
                    reached[method.Method] = ways = [];
                }

                ways.Add(method);
            }
        }

        var entryMethods = entries
            .Select(static entry => entry.Method.OriginalDefinition)
            .ToHashSet<IMethodSymbol>(SymbolEqualityComparer.Default);
        var windowOnly = WindowOnly(reach, reached, entryMethods);
        var flow = new CurrentInstanceFlow(
            reach,
            entries.Select(static entry => entry.Instance).OfType<IParameterSymbol>(),
            entries.Select(static entry => entry.Context).OfType<IParameterSymbol>(),
            method => windowOnly.Contains(method.OriginalDefinition)
        );
        var formAdds = reached
            .SelectMany(pair =>
                reach
                    .StorageCalls(pair.Key)
                    .Where(static call => call.Client == StorageClient.Data && call.Name == "InsertFormData")
                    .SelectMany(add => pair.Value.Select(way => new FormAdd(way.Entry, add)))
            )
            .ToList();
        var rewriter = new StorageCallRewriter(
            flow,
            DerivedFields.Read(context.ProjectFolder),
            formAdds,
            reach,
            new TaskBinding(context, reach)
        );
        var rewrites = new Dictionary<IMethodSymbol, MethodRewrite>(SymbolEqualityComparer.Default);
        foreach (var (method, ways) in reached)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (reach.Body(method) is not { } body)
            {
                continue;
            }

            var rewrite = new MethodRewrite(method, body, [.. ways.Select(static way => way.Entry).Distinct()])
            {
                Shared =
                    windowOnly.Contains(method) || entryMethods.Contains(method)
                        ? null
                        : Shared(method, ways[0].Entry, reach, entryMethods, windowOnly),
            };
            rewrite.Mutator = MutatorName(rewrite);
            var calls = reach.StorageCalls(method).OrderBy(static call => call.Syntax.SpanStart).ToList();
            if (calls.Count > 0)
            {
                rewriter.Plan(rewrite, calls);
            }

            WindowReports.Plan(rewrite, flow, context.CallbackActorIsKnown);
            rewrites[method] = rewrite;
        }

        var interfaceEdits = new List<(IMethodSymbol Member, Threading Threading)>();
        var threaded = Thread(reach, rewrites, entryMethods, windowOnly, flow, interfaceEdits);
        foreach (var dataCreation in entries.Where(static entry => entry.Kind == WindowEntryKind.DataCreation))
        {
            if (rewrites.TryGetValue(dataCreation.Method, out var rewrite))
            {
                MutatorThreading.Signature(rewrite, new Threading(dataCreation.Instance?.Ordinal, []));
                rewrite.UsesMutator = true;
            }
        }

        foreach (var rewrite in rewrites.Values)
        {
            WindowReports.AfterThreading(rewrite);
            reports.AddRange(rewrite.Reports);
            reports.AddRange(rewrite.RewriteReports);
        }

        var unused = UnusedClients.Find(rewrites.Values, reach, files).ToList();
        reports.AddRange(
            unused.Select(static client =>
                PortReport.Located(
                    client.File,
                    client.Anchor,
                    UpgradeMessageStatus.Warning,
                    $"removed the {client.Client} that {client.Type} no longer uses."
                )
            )
        );
        reports.AddRange(WindowReports.Unseen(reach, reached, tooDeep));
        // A DataCreation that reaches no Storage call in app code is not moved, but what it reaches in packages and
        // the caller identity it reads are reported like the moved entries'.
        var unmoved = dataCreations.Where(dataCreation => !entries.Contains(dataCreation)).ToList();
        var reachedUnmoved = new Dictionary<IMethodSymbol, List<ReachedMethod>>(
            reached,
            SymbolEqualityComparer.Default
        );
        foreach (var dataCreation in unmoved)
        {
            foreach (var method in reach.Reach(dataCreation, []))
            {
                if (!reachedUnmoved.TryGetValue(method.Method, out var ways))
                {
                    reachedUnmoved[method.Method] = ways = [];
                }

                ways.Add(method);
                if (!reached.ContainsKey(method.Method) && reach.Body(method.Method) is { } body)
                {
                    var probe = new MethodRewrite(method.Method, body, [dataCreation]);
                    WindowReports.Plan(probe, flow, context.CallbackActorIsKnown);
                    reports.AddRange(probe.Reports);
                }
            }
        }

        reports.AddRange(WindowReports.Packages(reach, reachedUnmoved, context));
        reports.AddRange(WindowReports.PackageTypes(files, context));
        reports.AddRange(WindowReports.ServiceTaskFailures(rewrites.Values, entries));
        reports.AddRange(WindowReports.PreClaim(files, reach, context));
        reports.AddRange(
            WindowReports.NotMoved(files, reach, reached.Keys.ToHashSet<IMethodSymbol>(SymbolEqualityComparer.Default))
        );
        reports.AddRange(DataCreationReports(rewrites, entries));
        return new StorageCallPort(rewrites, threaded, reports, interfaceEdits, files) { _unused = unused };
    }

    /// <summary>
    /// The hook in its v9 shape with its Storage calls moved: the body is rewritten first and then ported, so the
    /// port's compat locals are those the rewritten body still uses, and the mutator local goes after them.
    /// </summary>
    public PortedMethod Port(
        HookImplementation hook,
        TaskIds tasks,
        bool explicitFilter,
        bool asPublicMethod,
        string lineEnding
    )
    {
        if (
            hook.Declaration is not { } declaration
            || !_rewrites.TryGetValue(hook.Method.OriginalDefinition, out var rewrite)
            || rewrite.Edits.IsEmpty && !rewrite.UsesMutator
        )
        {
            return HookMethodPort.Rewrite(hook, tasks, explicitFilter, asPublicMethod, lineEnding);
        }

        var edited = rewrite.Edits.Apply(declaration, lineEnding);
        var ported = HookMethodPort.Rewrite(Rebound(hook, edited), tasks, explicitFilter, asPublicMethod, lineEnding);
        return rewrite.UsesMutator
            ? ported with
            {
                Rewritten = WithMutatorLocal(ported, rewrite.Mutator, lineEnding),
            }
            : ported;
    }

    /// <summary>The edits of every rewritten method that is not a hook the port moves.</summary>
    public void Apply(PortEdits edits)
    {
        foreach (var rewrite in _rewrites.Values)
        {
            var entry = rewrite.AsEntry;
            if (entry?.Kind is WindowEntryKind.Hook or WindowEntryKind.ProcessTask)
            {
                continue;
            }

            var threading = _threaded.GetValueOrDefault(rewrite.Method);
            if (rewrite.Edits.IsEmpty && threading is null && entry?.Kind != WindowEntryKind.DataCreation)
            {
                continue;
            }

            if (rewrite.Body.Declaration is not MethodDeclarationSyntax declaration)
            {
                continue;
            }

            var ordinal = entry?.Kind == WindowEntryKind.DataCreation ? entry.Instance?.Ordinal : threading?.Instance;
            var instance = ordinal is { } position ? rewrite.Method.Parameters[position] : null;
            var keepsInstance = ordinal is { } kept && MutatorThreading.StillUsed(rewrite, kept);
            var rewritten = rewrite.Edits.Apply(declaration, rewrite.LineEnding);
            if (instance is not null && keepsInstance)
            {
                rewritten = SyntaxEditing.WithStatementsFirst(
                    rewritten,
                    [
                        SyntaxFactory.ParseStatement(
                            $"{InstanceType(declaration, instance)} {instance.Name} = {rewrite.Mutator}.Instance;"
                        ),
                    ],
                    rewrite.LineEnding
                );
            }

            edits.For(rewrite.File).Replace(declaration, rewritten);
        }

        foreach (var client in _unused)
        {
            foreach (var (file, node) in client.Nodes)
            {
                edits.For(file).RemoveLine(node);
            }
        }

        foreach (
            var group in _unused
                .SelectMany(static client => client.Parameters)
                .GroupBy(static parameter => parameter.List)
        )
        {
            var (file, list, _) = group.First();
            var removed = group.Select(parameter => list.Parameters.IndexOf(parameter.Parameter)).ToHashSet();
            if (removed.Count == list.Parameters.Count && list.Parent is TypeDeclarationSyntax type)
            {
                edits
                    .For(file)
                    .Replace(
                        type,
                        current =>
                            current is TypeDeclarationSyntax { ParameterList: { } parameters } declaration
                                ? WithoutParameterList(declaration, parameters)
                                : current
                    );
                continue;
            }

            edits
                .For(file)
                .Replace(
                    list,
                    current =>
                        current is ParameterListSyntax parameters
                            ? parameters.WithParameters(
                                SyntaxFactory.SeparatedList(
                                    parameters.Parameters.Where((_, i) => !removed.Contains(i)),
                                    parameters
                                        .Parameters.GetSeparators()
                                        .Take(Math.Max(parameters.Parameters.Count - removed.Count - 1, 0))
                                )
                            )
                            : current
                );
        }

        var filesByTree = _files.ToDictionary(static file => file.Root.SyntaxTree, static file => file);
        foreach (
            var (member, threading) in _interfaceEdits.DistinctBy(
                static edit => edit.Member,
                SymbolEqualityComparer.Default
            )
        )
        {
            if (SyntaxEditing.Locate(member, filesByTree) is var (file, declaration))
            {
                edits
                    .For(file)
                    .Replace(
                        declaration.ParameterList,
                        MutatorThreading.Parameters(declaration.ParameterList, threading, "dataMutator")
                    );
            }
        }
    }

    private static TypeDeclarationSyntax WithoutParameterList(
        TypeDeclarationSyntax type,
        ParameterListSyntax parameters
    )
    {
        var trailing = parameters.GetTrailingTrivia();
        var stripped = type.WithParameterList(null);
        return stripped.TypeParameterList is { } typeParameters
            ? stripped.WithTypeParameterList(typeParameters.WithTrailingTrivia(trailing))
            : stripped.WithIdentifier(stripped.Identifier.WithTrailingTrivia(trailing));
    }

    private static WindowEntry HookEntry(HookImplementation hook)
    {
        var index = hook.Family.V8Parameters.ToList().IndexOf(HookParameterRole.Instance);
        return new WindowEntry(
            hook.Family.CompositeName is null ? WindowEntryKind.ProcessTask : WindowEntryKind.Hook,
            hook.Method.OriginalDefinition,
            hook.Declaration ?? throw new InvalidOperationException("A ported hook is declared in the app."),
            hook.File,
            index >= 0 ? hook.Method.Parameters[index].OriginalDefinition : null,
            null,
            true,
            hook
        );
    }

    /// <summary>The custom process tasks' v8 methods the port moves: not blocked, and doing something.</summary>
    private static IEnumerable<WindowEntry> ProcessTasks(
        IReadOnlyList<ScannedCSharpFile> files,
        IReadOnlyDictionary<IMethodSymbol, string> appCalls
    ) =>
        HookFamily
            .ProcessTaskMembers.SelectMany(family => HookImplementation.Find(family, files))
            .Where(hook =>
                hook.Declaration is { } method
                && HookMethodPort.BlockingReason(hook, appCalls) is null
                && !HookMethodPort.DoesNothing(method, hook.Model)
            )
            .Select(HookEntry);

    /// <summary>
    /// The reached methods only the entries and other such methods call, directly, so that a mutator parameter
    /// reaches every call of them.
    /// </summary>
    private static HashSet<IMethodSymbol> WindowOnly(
        WindowReach reach,
        IReadOnlyDictionary<IMethodSymbol, List<ReachedMethod>> reached,
        IReadOnlySet<IMethodSymbol> entries
    )
    {
        var only = reached
            .Keys.Where(method => !entries.Contains(method))
            .ToHashSet<IMethodSymbol>(SymbolEqualityComparer.Default);
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var method in only.ToList())
            {
                var callers = reach.CallersOf(method);
                if (
                    callers.Count == 0
                    || callers.Any(site =>
                        site.IsDelegate || !entries.Contains(site.Caller) && !only.Contains(site.Caller)
                    )
                )
                {
                    only.Remove(method);
                    changed = true;
                }
            }
        }

        return only;
    }

    /// <summary>Why <paramref name="method"/>, which the transition reaches, is not window-only.</summary>
    private static string Shared(
        IMethodSymbol method,
        WindowEntry entry,
        WindowReach reach,
        IReadOnlySet<IMethodSymbol> entries,
        IReadOnlySet<IMethodSymbol> windowOnly
    )
    {
        var callers = reach.CallersOf(method);
        if (callers.Any(static site => site.IsDelegate))
        {
            return "is used as a delegate, which the upgrade does not follow";
        }

        var others = callers
            .Select(static site => site.Caller)
            .Where(caller => !entries.Contains(caller) && !windowOnly.Contains(caller))
            .Select(Name)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToList();
        return others.Count == 0
            ? "is not called directly from the process hooks"
            : $"is called both from {entry.Name} and from {string.Join(", ", others)}, which do not run only in the "
                + "process transition";
    }

    /// <summary>
    /// Which helpers get the mutator: those whose rewrites use it, and the helpers between them and an entry; a helper
    /// that cannot get it keeps its Storage calls, each write with a to-do.
    /// </summary>
    private static Dictionary<IMethodSymbol, Threading> Thread(
        WindowReach reach,
        Dictionary<IMethodSymbol, MethodRewrite> rewrites,
        IReadOnlySet<IMethodSymbol> entries,
        IReadOnlySet<IMethodSymbol> windowOnly,
        CurrentInstanceFlow flow,
        List<(IMethodSymbol Member, Threading Threading)> interfaceEdits
    )
    {
        var need = rewrites
            .Values.Where(rewrite => rewrite.UsesMutator && !entries.Contains(rewrite.Method))
            .Select(static rewrite => rewrite.Method)
            .ToHashSet<IMethodSymbol>(SymbolEqualityComparer.Default);
        var failed = new Dictionary<IMethodSymbol, string>(SymbolEqualityComparer.Default);
        var families = new Dictionary<IMethodSymbol, MethodFamily>(SymbolEqualityComparer.Default);
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var method in need.ToList())
            {
                if (failed.ContainsKey(method))
                {
                    continue;
                }

                var callers = reach.CallersOf(method);
                if (MutatorThreading.Unthreadable(method, reach, windowOnly.Contains, callers) is { } reason)
                {
                    failed[method] = reason;
                    changed = true;
                    continue;
                }

                if (!families.TryGetValue(method, out var family))
                {
                    families[method] = family = MutatorThreading.Family(method, reach);
                }

                // An app interface member changes with every implementation, which must all be able to take it.
                foreach (var member in family.Implementations)
                {
                    if (failed.TryGetValue(member, out var memberReason))
                    {
                        failed[method] =
                            $"it implements {Name(family.InterfaceMembers[0])} with {Name(member)}, which cannot get the mutator: {memberReason}";
                        changed = true;
                        break;
                    }

                    if (need.Add(member))
                    {
                        changed = true;
                    }
                }

                if (failed.ContainsKey(method))
                {
                    continue;
                }

                foreach (var site in callers)
                {
                    if (entries.Contains(site.Caller))
                    {
                        continue;
                    }

                    if (failed.TryGetValue(site.Caller, out var callerReason))
                    {
                        failed[method] =
                            $"it is called from {Name(site.Caller)}, which cannot get the mutator: {callerReason}";
                        changed = true;
                        break;
                    }

                    if (need.Add(site.Caller))
                    {
                        changed = true;
                    }
                }
            }
        }

        // Also helpers whose rewrites need no mutator: a rule may have deleted a write there that must stay.
        foreach (var rewrite in rewrites.Values)
        {
            var method = rewrite.Method;
            if (
                !entries.Contains(method)
                && !need.Contains(method)
                && (!rewrite.Edits.IsEmpty || reach.StorageCalls(method).Any(WindowReports.IsWrite))
                && MutatorThreading.Unthreadable(method, reach, windowOnly.Contains, reach.CallersOf(method))
                    is { } reason
            )
            {
                failed[method] = reason;
            }
        }

        foreach (var (method, reason) in failed)
        {
            if (rewrites.TryGetValue(method, out var rewrite))
            {
                Unthreaded(rewrite, reach, reason);
            }
        }

        var threaded = new Dictionary<IMethodSymbol, Threading>(SymbolEqualityComparer.Default);
        var editedCalls = new HashSet<SyntaxNode>();
        foreach (var method in need.Where(method => !failed.ContainsKey(method)))
        {
            if (threaded.ContainsKey(method) || !families.TryGetValue(method, out var family))
            {
                continue;
            }

            var members = family.Implementations.Where(rewrites.ContainsKey).ToList();
            var callers = members.SelectMany(reach.CallersOf).DistinctBy(static site => site.Operation.Syntax).ToList();
            var threading = MutatorThreading.Plan(members, callers, flow, rewrites);
            foreach (var member in members)
            {
                threaded[member] = threading;
                MutatorThreading.Signature(rewrites[member], threading);
                rewrites[member].UsesMutator = true;
            }

            interfaceEdits.AddRange(family.InterfaceMembers.Select(member => (member, threading)));
            foreach (var site in callers)
            {
                if (editedCalls.Add(site.Operation.Syntax) && rewrites.TryGetValue(site.Caller, out var caller))
                {
                    // A call through the app's interface binds to the interface member, whose parameter is dataMutator.
                    var parameter =
                        site.Operation is IInvocationOperation { TargetMethod: var target }
                        && rewrites.TryGetValue(target.OriginalDefinition, out var callee)
                            ? callee.Mutator
                            : "dataMutator";
                    MutatorThreading.CallSite(caller, site.Operation, threading, parameter);
                }
            }
        }

        return threaded;
    }

    /// <summary>
    /// A helper the mutator cannot reach: its rewrites are dropped, so every Storage write it makes stays a direct one,
    /// also those a rule had deleted, and each gets the to-do of H-HELPER, naming the entry and the other callers,
    /// next to a rule's own to-do.
    /// </summary>
    private static void Unthreaded(MethodRewrite rewrite, WindowReach reach, string reason)
    {
        rewrite.RewriteReports.Clear();
        rewrite.Edits.Clear();
        rewrite.UsesMutator = false;
        var others = reach
            .CallersOf(rewrite.Method)
            .Select(static site => site.Caller)
            .Where(caller => !rewrite.Entries.Any(entry => SymbolEqualityComparer.Default.Equals(entry.Method, caller)))
            .Select(Name)
            .Distinct()
            .ToList();
        var calledFrom =
            others.Count > 0
                ? $"both from {rewrite.Entry.Name} and from {string.Join(", ", others)}"
                : $"from {rewrite.Entry.Name}";
        foreach (var call in reach.StorageCalls(rewrite.Method).Where(WindowReports.IsWrite))
        {
            AddOnce(
                rewrite,
                PortReport.Located(
                    rewrite.File,
                    call.Syntax,
                    UpgradeMessageStatus.Todo,
                    rewrite.Shared is { } shared
                        ? StorageCallRewriter.SharedHelperText(rewrite, call, shared)
                        : $"{Name(rewrite.Method)} writes to Storage with {call.DisplayName} and is called {calledFrom}; "
                            + $"it was left unchanged ({reason}). Give the process-hook path its own method that takes IInstanceDataMutator."
                )
            );
        }

        foreach (var call in rewrite.MovedReads)
        {
            AddOnce(
                rewrite,
                PortReport.Located(
                    rewrite.File,
                    call.Syntax,
                    UpgradeMessageStatus.Warning,
                    $"{call.DisplayName} still reads Storage directly in {Name(rewrite.Method)}, which cannot get the mutator "
                        + $"({reason}). The read works while the process is transitioning, but it does not see what the "
                        + "step changed before it."
                )
            );
        }

        rewrite.MovedWrites.Clear();
        rewrite.MovedReads.Clear();
    }

    private static void AddOnce(MethodRewrite rewrite, PortReport report)
    {
        if (!rewrite.Reports.Contains(report))
        {
            rewrite.Reports.Add(report);
        }
    }

    private static string Name(IMethodSymbol method) => $"{method.ContainingType.Name}.{method.Name}";

    private static IEnumerable<PortReport> DataCreationReports(
        Dictionary<IMethodSymbol, MethodRewrite> rewrites,
        IReadOnlyList<WindowEntry> entries
    )
    {
        foreach (var entry in entries.Where(static entry => entry.Kind == WindowEntryKind.DataCreation))
        {
            if (!rewrites.ContainsKey(entry.Method))
            {
                continue;
            }

            yield return PortReport.Located(
                entry.File,
                entry.Declaration,
                UpgradeMessageStatus.Warning,
                $"{entry.Name} now takes IInstanceDataMutator, the overload v9 calls; the data it changes through the "
                    + "mutator is saved with the new data element."
            );
        }
    }

    /// <summary>
    /// The hook as it would be with the edited method in place, bound in a copy of the compilation, so that the port
    /// sees which parameters the rewritten body still uses.
    /// </summary>
    private static HookImplementation Rebound(HookImplementation hook, MethodDeclarationSyntax edited)
    {
        var declaration =
            hook.Declaration ?? throw new InvalidOperationException("A ported hook is declared in the app.");
        var marker = new SyntaxAnnotation();
        var oldTree = hook.File.Root.SyntaxTree;
        var root = hook.File.Root.ReplaceNode(declaration, edited.WithAdditionalAnnotations(marker));
        var newTree = oldTree.WithRootAndOptions(root, oldTree.Options);
        var compilation = hook.Model.Compilation.ReplaceSyntaxTree(oldTree, newTree);
        var model = compilation.GetSemanticModel(newTree);
        var method = (MethodDeclarationSyntax)newTree.GetRoot().GetAnnotatedNodes(marker).Single();
        var symbol =
            model.GetDeclaredSymbol(method) ?? throw new InvalidOperationException("The rewritten hook does not bind.");
        return hook with
        {
            Method = symbol,
            Declaration = method,
            TypeDeclaration = (TypeDeclarationSyntax)(
                method.Parent ?? throw new InvalidOperationException("A method outside a type.")
            ),
            ReboundModel = model,
        };
    }

    /// <summary>
    /// <c>IInstanceDataMutator dataMutator = context.InstanceDataMutator;</c> after the task id local, and the
    /// instance local read from it.
    /// </summary>
    private static MethodDeclarationSyntax WithMutatorLocal(PortedMethod ported, string mutator, string lineEnding)
    {
        var method = ported.Rewritten;
        var local = SyntaxFactory.LocalDeclarationStatement(
            SyntaxFactory.VariableDeclaration(
                GeneratedTypeReferenceFinalizer.Reference(MutatorType).WithTrailingTrivia(SyntaxFactory.Space),
                SyntaxFactory.SingletonSeparatedList(
                    SyntaxFactory
                        .VariableDeclarator(SyntaxFactory.Identifier(mutator))
                        .WithInitializer(
                            SyntaxFactory
                                .EqualsValueClause(
                                    SyntaxFactory.ParseExpression($"{ported.ContextName}.InstanceDataMutator")
                                )
                                .WithEqualsToken(
                                    SyntaxFactory
                                        .Token(SyntaxKind.EqualsToken)
                                        .WithLeadingTrivia(SyntaxFactory.Space)
                                        .WithTrailingTrivia(SyntaxFactory.Space)
                                )
                        )
                )
            )
        );
        if (method.Body is not { } body)
        {
            return SyntaxEditing.WithStatementsFirst(method, [local], lineEnding);
        }

        var locals = ported.CompatLocals.Count;
        var instanceName = ported.CompatLocals.GetValueOrDefault(HookParameterRole.Instance);
        var at = 0;
        for (var i = 0; i < Math.Min(locals, body.Statements.Count); i++)
        {
            if (
                body.Statements[i] is LocalDeclarationStatementSyntax { Declaration.Variables: [var variable] }
                && variable.Identifier.ValueText == instanceName
            )
            {
                break;
            }

            at = i + 1;
        }

        var statements = body.Statements.ToList();
        var template = statements.Count > at ? statements[at] : statements.LastOrDefault();
        var laid = local
            .WithLeadingTrivia(
                template?.GetLeadingTrivia().Where(static t => t.IsKind(SyntaxKind.WhitespaceTrivia)) ?? []
            )
            .WithTrailingTrivia(SyntaxFactory.EndOfLine(lineEnding));
        statements.Insert(at, laid);
        if (instanceName is not null)
        {
            for (var i = at + 1; i < statements.Count; i++)
            {
                if (
                    statements[i]
                        is LocalDeclarationStatementSyntax { Declaration.Variables: [var variable] } declaration
                    && variable.Identifier.ValueText == instanceName
                    && variable.Initializer is { } initializer
                )
                {
                    statements[i] = declaration.ReplaceNode(
                        initializer.Value,
                        SyntaxFactory.ParseExpression($"{mutator}.Instance").WithTriviaFrom(initializer.Value)
                    );
                    break;
                }
            }
        }

        return method.WithBody(body.WithStatements(SyntaxFactory.List(statements)));
    }

    /// <summary>The name of the mutator in a method: a name the method does not use already.</summary>
    private static string MutatorName(MethodRewrite rewrite)
    {
        if (rewrite.AsEntry is { Kind: WindowEntryKind.ServiceTask, Context: { } context })
        {
            return $"{context.Name}.InstanceDataMutator";
        }

        return rewrite.FreshName("dataMutator");
    }

    private static string InstanceType(MethodDeclarationSyntax declaration, IParameterSymbol instance) =>
        declaration.ParameterList.Parameters.Count > instance.Ordinal
        && declaration.ParameterList.Parameters[instance.Ordinal].Type is { } type
            ? type.WithoutTrivia().ToString()
            : "Instance";
}
