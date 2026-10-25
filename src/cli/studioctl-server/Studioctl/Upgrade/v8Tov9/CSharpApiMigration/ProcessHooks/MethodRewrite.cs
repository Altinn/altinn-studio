using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>An element a rewritten add creates, held in a local that later code may use.</summary>
internal sealed record AddedElement(
    ILocalSymbol Local,
    StorageClientCall Add,
    ExpressionSyntax DataType,
    ISymbol? Model
);

/// <summary>A form add in a method that <paramref name="Entry"/> reaches.</summary>
internal sealed record FormAdd(WindowEntry Entry, StorageClientCall Add);

/// <summary>
/// What the rewrite does to one method the process transition runs: its edits, its messages, and whether it needs
/// the mutator, which an entry has and a helper gets as a parameter.
/// </summary>
internal sealed class MethodRewrite(IMethodSymbol method, MemberBody body, IReadOnlyList<WindowEntry> entries)
{
    public IMethodSymbol Method { get; } = method;

    public MemberBody Body { get; } = body;

    public ScannedCSharpFile File => Body.File;

    /// <summary>The entries that reach the method, the first being the one reports name.</summary>
    public IReadOnlyList<WindowEntry> Entries { get; } = entries;

    public WindowEntry Entry => Entries[0];

    /// <summary>The method's own entry, when it is one.</summary>
    public WindowEntry? AsEntry =>
        Entries.FirstOrDefault(entry => SymbolEqualityComparer.Default.Equals(entry.Method.OriginalDefinition, Method));

    public MethodEdits Edits { get; } = new();

    public List<PortReport> Reports { get; } = [];

    /// <summary>
    /// Why a helper the transition reaches is called from elsewhere too, so that a mutator parameter would not reach
    /// every call, in the words of its to-do; <c>null</c> for an entry or a helper only the transition calls.
    /// </summary>
    public string? Shared { get; init; }

    /// <summary>The expression for the mutator in this method: a local, a parameter, or the service task's context.</summary>
    public string Mutator { get; set; } = "dataMutator";

    /// <summary>Whether a rewrite in the method uses <see cref="Mutator"/>.</summary>
    public bool UsesMutator { get; set; }

    /// <summary>The writes moved to the mutator, for the reports about what happens to them when the step fails.</summary>
    public List<StorageClientCall> MovedWrites { get; } = [];

    /// <summary>The data element writes left as they are because v9 refuses them at the task they run at.</summary>
    public List<StorageClientCall> RefusedWrites { get; } = [];

    /// <summary>The reads moved to the mutator.</summary>
    public List<StorageClientCall> MovedReads { get; } = [];

    public List<AddedElement> Added { get; } = [];

    /// <summary>The data types whose authentication was overridden already.</summary>
    public HashSet<string> OverriddenDataTypes { get; } = new(StringComparer.Ordinal);

    public bool InDataCreation => Entries.Any(static entry => entry.Kind == WindowEntryKind.DataCreation);

    public bool InCallback => Entries.Any(static entry => entry.InCallback);

    public string LineEnding => SyntaxEditing.LineEnding(File.Root);

    public bool IsAsync =>
        Body.Declaration is MethodDeclarationSyntax declaration && declaration.Modifiers.Any(SyntaxKind.AsyncKeyword);

    public void Warn(SyntaxNode node, string text) =>
        Reports.Add(PortReport.Located(File, node, UpgradeMessageStatus.Warning, text));

    /// <summary>A warning about a rewrite, which goes with it when the method cannot get the mutator.</summary>
    public void Moved(SyntaxNode node, string text) =>
        RewriteReports.Add(PortReport.Located(File, node, UpgradeMessageStatus.Warning, text));

    /// <summary>The warnings about rewrites, see <see cref="Moved"/>.</summary>
    public List<PortReport> RewriteReports { get; } = [];

    public void Todo(SyntaxNode node, string text) =>
        Reports.Add(PortReport.Located(File, node, UpgradeMessageStatus.Todo, text));

    /// <summary>The mutator as an expression to put into rewritten code.</summary>
    public ExpressionSyntax MutatorExpression()
    {
        UsesMutator = true;
        return SyntaxFactory.ParseExpression(Mutator);
    }

    /// <summary>A name for a new local that nothing in the method uses, and the rewrite has not taken, yet.</summary>
    public string FreshName(string name)
    {
        var used = Body
            .Declaration.DescendantTokens()
            .Where(static token => token.IsKind(SyntaxKind.IdentifierToken))
            .Select(static token => token.ValueText)
            .ToHashSet(StringComparer.Ordinal);
        var candidate = name;
        var suffix = 2;
        while (used.Contains(candidate) || _taken.Contains(candidate))
        {
            candidate = name + suffix.ToString(System.Globalization.CultureInfo.InvariantCulture);
            suffix++;
        }

        _taken.Add(candidate);
        return candidate;
    }

    private readonly HashSet<string> _taken = new(StringComparer.Ordinal);
}
