using Microsoft.CodeAnalysis.FlowAnalysis;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.App.Analyzers;

/// <summary>
/// Reports the two mistakes about a mailbox handle that an analyzer can <em>prove</em>: the same handle answered
/// by two handlers (<c>ALTINNAPP0702</c>), and a mailbox opened whose handle is never passed anywhere at all
/// (<c>ALTINNAPP0703</c>). Both are refused by
/// <c>ServiceTaskPipelineBuilder</c> when the pipeline composes, which fails app startup; this analyzer is the
/// earlier, narrower signal for the shapes it can be certain about, and the builder stays authoritative.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Calibration, per <see cref="IncompleteBuilderAnalyzer"/>'s doctrine:</strong> these are Error
/// severity, so a false positive breaks an app's build, and only the provable case is reported. A handle is
/// followed exactly as far as a single local goes: the <c>out</c> variable the mailbox-opening <c>Stage</c>
/// overload declared, mentioned nowhere but positions that provably only read it, with both answers in one
/// basic block that lies on <em>every path to the method's exit</em>. Everything else — a handle stored, passed
/// on, captured or reassigned, and two answers that do not both certainly run — is left to the builder's own
/// throw, the same division <c>ALTINNAPP0701</c> draws when it leaves unprovable non-completion to startup
/// validation. One exclusion is worth naming because nothing in the source shows it: two answers in a
/// <c>while (true)</c> body are not reported, the compiler keeping a statically-dead exit edge that leaves the
/// exit reachable without them.
/// </para>
/// <para>
/// The never-answered companion is held to the same standard from the other side: it fires only when the local
/// has <em>no</em> reference besides its declaration, which is what makes "nothing answers this mailbox" a fact
/// about the whole program rather than about this method — an unreferenced handle cannot escape, so no handler
/// anywhere can have received it. A handle discarded outright (<c>out _</c>) declares no local and is not
/// reported, following the same reading of an explicit discard that <c>ALTINNAPP0701</c> takes.
/// </para>
/// <para>
/// <strong>Maintenance note:</strong> which methods answer a handle is two string constants here, so a builder
/// method added later that also answers one drops out of both rules silently — no diagnostic, and nothing
/// failing a build to say so. A new answering method needs its name added below.
/// </para>
/// </remarks>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class MailboxHandleAnalyzer : DiagnosticAnalyzer
{
    private const string BuilderFullName = "Altinn.App.Core.Features.Process.ServiceTaskPipelineBuilder";
    private const string HandleFullName = "Altinn.App.Core.Features.Process.MailboxHandle";

    private const string StageMethodName = "Stage";
    private const string HandleRepliesMethodName = "HandleReplies";
    private const string ConcludeOnRepliesMethodName = "ConcludeOnReplies";
    private const string HandleParameterName = "handle";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        [Diagnostics.Contracts.MailboxHandleAnsweredTwice, Diagnostics.Contracts.MailboxNeverAnswered];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            INamedTypeSymbol? builderType = startContext.Compilation.GetTypeByMetadataName(BuilderFullName);
            INamedTypeSymbol? handleType = startContext.Compilation.GetTypeByMetadataName(HandleFullName);
            if (builderType is null || handleType is null)
                return;

            startContext.RegisterOperationBlockAction(ctx => Analyze(ctx, builderType, handleType));
        });
    }

    private static void Analyze(
        OperationBlockAnalysisContext context,
        INamedTypeSymbol builderType,
        INamedTypeSymbol handleType
    )
    {
        var state = new BlockState();

        foreach (IOperation operationBlock in context.OperationBlocks)
        {
            foreach (IOperation operation in operationBlock.DescendantsAndSelf())
            {
                switch (operation)
                {
                    case ILocalReferenceOperation reference:
                        TrackLocalReference(state, reference, builderType, handleType);
                        break;
                    case IInvocationOperation invocation:
                        TrackConsumption(state, invocation, builderType);
                        break;
                }
            }
        }

        if (state.IsEmpty)
            return;

        Report(context, state);
    }

    /// <summary>
    /// Records what this block does with every <c>MailboxHandle</c> local: the mailbox-opening declaration that
    /// introduced it, how many times it is mentioned at all, and whether every mention is a position that
    /// provably only reads it.
    /// </summary>
    private static void TrackLocalReference(
        BlockState state,
        ILocalReferenceOperation reference,
        INamedTypeSymbol builderType,
        INamedTypeSymbol handleType
    )
    {
        if (!SymbolEqualityComparer.Default.Equals(reference.Local.Type, handleType))
            return;

        TrackedLocal tracked = state.Local(reference.Local);
        tracked.References++;

        if (reference.IsDeclaration)
        {
            if (tracked.Declaration is not null)
            {
                // Cannot happen for a C# local, but a second declaration would make "the mailbox this local
                // names" ambiguous, so treat it as unknowable rather than picking one.
                tracked.Disqualified = true;
                return;
            }

            tracked.Declaration = ReadMailboxDeclaration(reference, builderType);
            if (tracked.Declaration is null)
                tracked.Disqualified = true;
            return;
        }

        // A write after the declaration means the local no longer names one mailbox. What counts as a write is
        // stated the other way round — a whitelist of positions that provably only read — because a list of
        // write forms has to be complete forever and quietly wasn't: `ref MailboxHandle alias = ref h` hides
        // the write behind an initializer and `(h, _) = …` hides it inside a tuple, so neither looked like an
        // assignment to this local.
        if (reference.Parent is not IArgumentOperation { Parameter: { RefKind: RefKind.None or RefKind.In } })
        {
            tracked.Disqualified = true;
        }
    }

    /// <summary>
    /// Records an invocation of <c>HandleReplies</c> or <c>ConcludeOnReplies</c> whose <c>handle</c> argument is a
    /// plain local read. Anything else — a field, a property, a parameter, a method call — is a handle this
    /// analyzer cannot follow, and is left to the builder.
    /// </summary>
    private static void TrackConsumption(
        BlockState state,
        IInvocationOperation invocation,
        INamedTypeSymbol builderType
    )
    {
        IMethodSymbol target = invocation.TargetMethod;
        if (target.Name is not (HandleRepliesMethodName or ConcludeOnRepliesMethodName))
            return;
        if (!SymbolEqualityComparer.Default.Equals(target.ContainingType, builderType))
            return;

        foreach (IArgumentOperation argument in invocation.Arguments)
        {
            if (argument.Parameter?.Name != HandleParameterName)
                continue;

            // No unwrapping of conversions or other wrappers: a reference sitting inside one is not a position
            // TrackLocalReference recognises as a read, so its local is disqualified there anyway.
            if (argument.Value is ILocalReferenceOperation { IsDeclaration: false } local)
                state.Local(local.Local).Consumptions.Add(invocation);
            return;
        }
    }

    /// <summary>
    /// Reads the mailbox-opening <c>Stage</c> call an <c>out</c> declaration belongs to, and the identifier of
    /// the local the handle was declared into, which names its exchange in every diagnostic. Null when the
    /// declaration is anything else.
    /// </summary>
    private static MailboxDeclaration? ReadMailboxDeclaration(
        ILocalReferenceOperation declaration,
        INamedTypeSymbol builderType
    )
    {
        if (declaration.Parent is not IDeclarationExpressionOperation declarationExpression)
            return null;
        if (
            declarationExpression.Parent
            is not IArgumentOperation { Parameter: { RefKind: RefKind.Out, Name: HandleParameterName } } argument
        )
            return null;
        if (argument.Parent is not IInvocationOperation stage)
            return null;
        if (
            stage.TargetMethod.Name != StageMethodName
            || !SymbolEqualityComparer.Default.Equals(stage.TargetMethod.ContainingType, builderType)
        )
            return null;

        return new MailboxDeclaration(declaration.Syntax.GetLocation(), declaration.Local.Name);
    }

    private static void Report(OperationBlockAnalysisContext context, BlockState state)
    {
        StraightLineMap? straightLine = null;

        foreach (TrackedLocal tracked in state.Locals)
        {
            if (tracked.Disqualified || tracked.Declaration is not MailboxDeclaration declaration)
                continue;

            if (tracked.Consumptions.Count == 0)
            {
                if (tracked.References == 1)
                {
                    context.ReportDiagnostic(
                        Diagnostic.Create(
                            Diagnostics.Contracts.MailboxNeverAnswered,
                            declaration.Location,
                            declaration.HandleIdentifier
                        )
                    );
                }
                continue;
            }

            if (tracked.Consumptions.Count == 1)
                continue;

            straightLine ??= StraightLineMap.Build(context);
            ReportDoubleConsumption(context, tracked, declaration, straightLine);
        }
    }

    /// <summary>
    /// Reports every consumption of the handle that an <em>earlier</em> consumption unconditionally precedes.
    /// See <see cref="StraightLineMap"/> for what makes that provable.
    /// </summary>
    private static void ReportDoubleConsumption(
        OperationBlockAnalysisContext context,
        TrackedLocal tracked,
        MailboxDeclaration declaration,
        StraightLineMap straightLine
    )
    {
        List<IInvocationOperation> consumptions = tracked.Consumptions;
        for (int i = 0; i < consumptions.Count; i++)
        {
            IInvocationOperation later = consumptions[i];

            // Unmapped means the call sits where this block's own control flow does not go — a lambda or a local
            // function body, each with a flow graph of its own — so nothing about its order is proven.
            if (straightLine.Find(later.Syntax) is not int block)
                continue;

            for (int j = 0; j < consumptions.Count; j++)
            {
                // Evaluation order within one block, read off the source: a fluent chain nests its receiver, so
                // the earlier call is the one whose expression ends first, and siblings run left to right.
                if (i == j || consumptions[j].Syntax.Span.End >= later.Syntax.Span.End)
                    continue;
                if (straightLine.Find(consumptions[j].Syntax) != block)
                    continue;

                if (!straightLine.RunsOnEveryPath(block))
                    break;

                context.ReportDiagnostic(
                    Diagnostic.Create(
                        Diagnostics.Contracts.MailboxHandleAnsweredTwice,
                        CallLocation(later),
                        declaration.HandleIdentifier
                    )
                );
                break;
            }
        }
    }

    /// <summary>
    /// The squiggle goes under the handler's own name rather than the whole fluent chain the invocation's syntax
    /// spans, which would start at the pipeline parameter several lines up.
    /// </summary>
    private static Location CallLocation(IInvocationOperation invocation) =>
        invocation.Syntax is InvocationExpressionSyntax { Expression: MemberAccessExpressionSyntax member }
            ? member.Name.GetLocation()
            : invocation.Syntax.GetLocation();

    /// <summary>The mailbox-opening <c>Stage</c> call an <c>out</c> declaration came from.</summary>
    private sealed class MailboxDeclaration(Location location, string handleIdentifier)
    {
        internal Location Location { get; } = location;

        /// <summary>
        /// The local the handle was declared into — the exchange's identity as the diagnostics name it, since
        /// the <c>out</c> variable is what the author wrote to route the exchange to its handler.
        /// </summary>
        internal string HandleIdentifier { get; } = handleIdentifier;
    }

    private sealed class TrackedLocal
    {
        internal MailboxDeclaration? Declaration { get; set; }

        /// <summary>Set when the local no longer certainly names one known mailbox, so both rules give way.</summary>
        internal bool Disqualified { get; set; }

        /// <summary>
        /// Every mention of the local, the declaration included. One means the handle never left the expression
        /// that opened it.
        /// </summary>
        internal int References { get; set; }

        internal List<IInvocationOperation> Consumptions { get; } = [];
    }

    private sealed class BlockState
    {
        private Dictionary<ILocalSymbol, TrackedLocal>? _locals;

        internal bool IsEmpty => _locals is null;

        internal IEnumerable<TrackedLocal> Locals => _locals?.Values ?? Enumerable.Empty<TrackedLocal>();

        internal TrackedLocal Local(ILocalSymbol local)
        {
            _locals ??= new Dictionary<ILocalSymbol, TrackedLocal>(SymbolEqualityComparer.Default);
            if (!_locals.TryGetValue(local, out TrackedLocal? tracked))
            {
                tracked = new TrackedLocal();
                _locals[local] = tracked;
            }
            return tracked;
        }
    }

    /// <summary>
    /// Which branch-free run of the block's control flow each call sits in, and whether that run happens on every
    /// execution that returns. Both halves are needed for the proof this rule rests on. One basic block means the
    /// two answers run in a fixed order with nothing able to skip the second — an <c>if</c>/<c>else</c>, a
    /// <c>?.</c> or a <c>?:</c> would put them in different blocks. Lying on every path to the exit means they run
    /// at all: two answers inside <c>if (false) { … }</c> or a loop over an empty sequence share a block that never
    /// runs, and the code around them composes a perfectly valid pipeline.
    /// </summary>
    /// <remarks>
    /// <para>
    /// "On every path" is answered by deleting the candidate block and asking whether the exit is still reachable
    /// from the entry. Unreachable means every execution that returns ran the block, and so answered the mailbox
    /// twice. The argument rests on nothing about how the graph orders or numbers its blocks.
    /// </para>
    /// <para>
    /// <strong>Which edges the walk follows is where that argument can go wrong, and the risk runs one way:</strong>
    /// leaving an edge out makes the exit look less reachable, which turns silence into a report. So every edge kind
    /// left out has to be one that no returning execution can traverse.
    /// <see cref="ControlFlowBranchSemantics.Regular"/> and <see cref="ControlFlowBranchSemantics.Return"/> are
    /// followed, being exactly the edges a returning execution uses.
    /// <see cref="ControlFlowBranchSemantics.ProgramTermination"/>,
    /// <see cref="ControlFlowBranchSemantics.None"/> and <see cref="ControlFlowBranchSemantics.Error"/> qualify to
    /// be left out — nothing returns along them.
    /// <see cref="ControlFlowBranchSemantics.StructuredExceptionHandling"/> qualifies for a more particular reason:
    /// normal completion of a <c>try</c> is routed <em>around</em> its <c>finally</c> by an ordinary
    /// <see cref="ControlFlowBranchSemantics.Regular"/> branch that records the finally it passes, so no returning
    /// route ever needs an SEH edge.
    /// </para>
    /// <para>
    /// <see cref="ControlFlowBranchSemantics.Throw"/> and <see cref="ControlFlowBranchSemantics.Rethrow"/>
    /// <strong>do not qualify</strong>, and they are why this walk needs more than branches. A returning execution
    /// reaches a <c>catch</c> through exactly those, and they carry no destination to walk to — a handler is
    /// entered through a region. Two shapes turn on it: a candidate <em>after</em> a <c>try</c> whose handler
    /// returns is routed around when the <c>try</c> throws, and a candidate <em>inside</em> a <c>try</c> can be
    /// entered, throw, and still return if the handler swallows —
    /// <c>try { Handle(h); Handle(h); } catch (InvalidOperationException) { }</c> composes a valid pipeline, the
    /// first answer having stuck and the second one's complaint having gone nowhere. Both are covered by one
    /// mechanism: every handler guarding a block the walk arrives at is pushed as a way onward, whether or not the
    /// block itself is the candidate. A handler that rethrows or throws anew reaches no exit, so it opens no route
    /// and those cases still report, correctly. A <c>finally</c> needs no treatment at all: returning from one is
    /// CS0157, so it cannot swallow, and its own blocks are unreachable to this walk anyway.
    /// </para>
    /// </remarks>
    private sealed class StraightLineMap
    {
        private readonly List<(ControlFlowGraph Graph, BasicBlock Block)> _byId = [];

        private readonly Dictionary<SyntaxNode, int> _idBySyntax = new();

        private readonly Dictionary<int, bool> _runsOnEveryPath = new();

        internal static StraightLineMap Build(OperationBlockAnalysisContext context)
        {
            var map = new StraightLineMap();

            foreach (IOperation operationBlock in context.OperationBlocks)
            {
                // ControlFlowGraph.Create accepts these roots and throws on anything else, so ask only for
                // those; an unsupported root leaves its calls unmapped, which reports nothing.
                if (
                    operationBlock
                    is not (
                        IBlockOperation
                        or IMethodBodyOperation
                        or IConstructorBodyOperation
                        or IFieldInitializerOperation
                        or IPropertyInitializerOperation
                        or IParameterInitializerOperation
                    )
                )
                    continue;

                ControlFlowGraph graph = context.GetControlFlowGraph(operationBlock);
                foreach (BasicBlock basicBlock in graph.Blocks)
                {
                    // Ids are handed out across graphs, so two blocks in different graphs are never mistaken for
                    // one branch-free run however each graph numbers its own.
                    int id = map._byId.Count;
                    map._byId.Add((graph, basicBlock));

                    foreach (IOperation operation in basicBlock.Operations)
                        map.Record(operation, id);
                    if (basicBlock.BranchValue is { } branchValue)
                        map.Record(branchValue, id);
                }
            }

            return map;
        }

        internal int? Find(SyntaxNode syntax) => _idBySyntax.TryGetValue(syntax, out int id) ? id : null;

        internal bool RunsOnEveryPath(int id)
        {
            if (_runsOnEveryPath.TryGetValue(id, out bool answer))
                return answer;

            (ControlFlowGraph graph, BasicBlock block) = _byId[id];
            answer = LiesOnEveryPathToExit(graph, block);
            _runsOnEveryPath[id] = answer;
            return answer;
        }

        private static bool LiesOnEveryPathToExit(ControlFlowGraph graph, BasicBlock candidate)
        {
            if (candidate.Kind != BasicBlockKind.Block)
                return false;

            BasicBlock? entry = null;
            foreach (BasicBlock block in graph.Blocks)
            {
                if (block.Kind == BasicBlockKind.Entry)
                {
                    entry = block;
                    break;
                }
            }

            if (entry is null || ReferenceEquals(entry, candidate))
                return false;

            // Ordinals are documented as the block's index in Graph.Blocks, so they are safe to use as slots.
            var seen = new bool[graph.Blocks.Length];
            var pending = new Stack<BasicBlock>();
            seen[entry.Ordinal] = true;
            pending.Push(entry);

            while (pending.Count > 0)
            {
                BasicBlock block = pending.Pop();
                if (block.Kind == BasicBlockKind.Exit)
                    return false;

                Follow(graph, block.FallThroughSuccessor, candidate, seen, pending);
                Follow(graph, block.ConditionalSuccessor, candidate, seen, pending);

                // Control is inside this block's try regions, so their handlers can run from here.
                PushHandlers(graph, block, candidate, seen, pending);
            }

            return true;
        }

        private static void Follow(
            ControlFlowGraph graph,
            ControlFlowBranch? branch,
            BasicBlock candidate,
            bool[] seen,
            Stack<BasicBlock> pending
        )
        {
            if (branch?.Destination is not BasicBlock next)
                return;
            if (branch.Semantics is not (ControlFlowBranchSemantics.Regular or ControlFlowBranchSemantics.Return))
                return;

            if (ReferenceEquals(next, candidate))
            {
                // The block being deleted is still entered — control arrives, and the throw that runs a handler
                // can come from the very statements this rule is asking about. So the handlers guarding it are
                // reachable even though the block itself is not walked.
                PushHandlers(graph, next, candidate, seen, pending);
                return;
            }

            Push(next, candidate, seen, pending);
        }

        /// <summary>
        /// Pushes the way into every <c>catch</c> guarding <paramref name="block"/>. A handler is entered through
        /// a region rather than a branch, and the edges that reach it are <c>Throw</c> and <c>Rethrow</c>, which
        /// carry no destination — so without this the walk cannot see a route that leaves a <c>try</c> through
        /// its handler, and a block that a caught exception routes around would look inescapable.
        /// </summary>
        private static void PushHandlers(
            ControlFlowGraph graph,
            BasicBlock block,
            BasicBlock candidate,
            bool[] seen,
            Stack<BasicBlock> pending
        )
        {
            for (ControlFlowRegion? region = block.EnclosingRegion; region is not null; region = region.EnclosingRegion)
            {
                if (
                    region.Kind != ControlFlowRegionKind.Try
                    || region.EnclosingRegion is not { Kind: ControlFlowRegionKind.TryAndCatch } tryAndCatch
                )
                    continue;

                foreach (ControlFlowRegion handler in tryAndCatch.NestedRegions)
                {
                    switch (handler.Kind)
                    {
                        case ControlFlowRegionKind.Catch:
                            Push(graph.Blocks[handler.FirstBlockOrdinal], candidate, seen, pending);
                            break;

                        case ControlFlowRegionKind.FilterAndHandler:
                            // A filter runs before its handler; both entry points go in rather than relying on
                            // the edge between them being one this walk follows. Pushing a block that turns out
                            // to be unreachable only makes the exit look more reachable — the safe way to be
                            // wrong here.
                            foreach (ControlFlowRegion part in handler.NestedRegions)
                                Push(graph.Blocks[part.FirstBlockOrdinal], candidate, seen, pending);
                            break;
                    }
                }
            }
        }

        private static void Push(BasicBlock next, BasicBlock candidate, bool[] seen, Stack<BasicBlock> pending)
        {
            if (ReferenceEquals(next, candidate) || seen[next.Ordinal])
                return;

            seen[next.Ordinal] = true;
            pending.Push(next);
        }

        private void Record(IOperation root, int id)
        {
            foreach (IOperation operation in root.DescendantsAndSelf())
            {
                if (operation is IInvocationOperation)
                    _idBySyntax[operation.Syntax] = id;
            }
        }
    }
}
