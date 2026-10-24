using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;
using Microsoft.CodeAnalysis.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

/// <summary>
/// Removes the unlock, write and lock of the data element being read from an <c>IDataProcessor.ProcessDataRead</c>
/// implementation. A v8 app did that to save what it copied into the form while a task had the form locked, such as
/// the payment details on the payment receipt. v9 refuses all three while the workflow engine processes the instance,
/// which it does when it renders the payment receipt, so the read fails there.
/// </summary>
/// <remarks>
/// <para>
/// The match is these statements in a row, in a block of the method itself rather than of a lambda or local function:
/// <c>DataElement element = await dataClient.UnlockDataElement(…, dataId);</c>, optionally
/// <c>await dataClient.Update(instance, element);</c>, one write, <c>await dataClient.LockDataElement(…, dataId);</c>
/// with its result discarded or assigned to <c>element</c>, and optionally
/// <c>await dataClient.Update(instance, element);</c> again. The write is
/// <c>await dataClient.UpdateData(form, …, dataId);</c> or
/// <c>await dataClient.UpdateFormData(instance, form, element);</c>, and <c>UpdateFormData</c> may be passed a
/// <c>typeof</c> expression instead of the form. Every call binds to <c>Altinn.App.Core.Internal.Data.IDataClient</c>,
/// and its arguments are matched by parameter name. <c>instance</c>, <c>dataId</c> and <c>data</c> are the method's
/// first three parameters, whatever their names; <c>dataId</c> may be cast or unwrapped with <c>.Value</c>, and the
/// form is <c>data</c> or a pattern variable on it, as <c>form</c> in <c>data is Model form</c>. Neither
/// <c>dataId</c>, <c>data</c> nor the form variable is written anywhere in the method, the element is used nowhere
/// else, and the statements hold nothing but the calls, their awaits and plain values, such as
/// <c>appIdentifier.Org</c>, <c>typeof(Form)</c> or <c>(Guid)dataId</c>, and no comment or preprocessor directive.
/// A method with code excluded by a preprocessor condition is skipped, since the compilation does not see that code.
/// Anything else is left alone, without a message.
/// </para>
/// <para>
/// The instance identifier, <c>instanceGuid</c>, <c>org</c>, <c>app</c> and party id arguments are not checked: the
/// data element id identifies the element, and they only locate the instance it belongs to. <c>UpdateBinaryData</c>
/// is not matched: it was never seen, and v9 saving changes to the form itself says nothing about an arbitrary stream.
/// </para>
/// <para>
/// Removing the statements is safe because v9 still runs <c>ProcessDataRead</c> on every read of form data and returns
/// what it changes in the form to the caller, and saves the change itself where that is allowed: the data endpoint when
/// the instance is not being processed, the element is not locked and the data changed, and the form bootstrap when
/// the instance is not being processed and no PDF is being rendered, leaving out locked elements. What the method
/// copies into the form is still shown, but no longer saved. v9 still has these <c>IDataClient</c> members, so without
/// the rewrite the app compiles and fails at run time. The statements around the removed ones stay, also a block left
/// empty, which marks the spot the warning points at.
/// </para>
/// <para>
/// Each removal is reported at the line of the unlock in the file before the rewrite, so that two removals in one
/// file both point at the lines the user knows.
/// </para>
/// <para>
/// Seen in <c>lt/background-check</c>, <c>dmf/undersokelsesrett-arsavgift</c>, <c>dmf/utvinningsrett-arsavgift</c>,
/// <c>dmf/undersokelsestillatelse-soknad</c>, <c>dmf/driftskonsesjon-overdra</c> and <c>dmf/utvinningsrett-soknad</c>,
/// on library versions 8.7.2 to 8.12.7, in a survey of production apps from 2026-10-20 to 2026-10-22. The first three
/// copy the payment details into the form before the write, <c>undersokelsestillatelse-soknad</c> writes the form
/// unchanged, and the last two pass <c>typeof(model)</c> as the data, which v8's serializer throws on after the
/// element is already unlocked.
/// </para>
/// </remarks>
internal sealed class UnlockWriteRelockInProcessDataReadScenario : IKnownScenario
{
    private const string DataProcessorName = "Altinn.App.Core.Features.IDataProcessor";
    private const string DataClientName = "Altinn.App.Core.Internal.Data.IDataClient";

    private const string Removed =
        "removed the unlock, write and lock of the data element being read in ProcessDataRead. "
        + "v9 refuses them while the workflow engine processes the instance, as when it renders the payment receipt. "
        + "Changes the method makes to the form data are still shown, but no longer saved.";

    private const string TypeWritten = " The removed write passed a type instead of the data, so it failed in v8 too.";

    public MigrationResult Apply(CSharpSourceScanner scanner)
    {
        var runs = scanner.Files.SelectMany(FindRuns).ToList();
        var messages = runs.OrderBy(static run => run.File.RelativePath.Replace('\\', '/'), StringComparer.Ordinal)
            .ThenBy(static run => run.Statements[0].SpanStart)
            .Select(Report)
            .ToList();

        foreach (var file in runs.GroupBy(static run => run.File))
        {
            scanner.Update(file.Key, Remove(file.Key.Root, [.. file]));
        }

        return new MigrationResult(messages);
    }

    private static IEnumerable<Run> FindRuns(ScannedCSharpFile file) =>
        file.SemanticModel is { } model
            ? file
                .Root.DescendantNodes()
                .OfType<MethodDeclarationSyntax>()
                .Select(declaration => Implementation.Of(file, model, declaration))
                .OfType<Implementation>()
                .SelectMany(static implementation => implementation.Runs())
            : [];

    private static UpgradeMessage Report(Run run)
    {
        var line = run.File.GetLine(run.Statements[0]);
        var suffix = run.WritesType ? TypeWritten : "";
        return new($"{run.File.RelativePath}:{line}: {Removed}{suffix}", UpgradeMessageStatus.Warning);
    }

    /// <summary>
    /// Removes the runs with their trivia. A block that started with a run would keep the blank lines after the run
    /// below its opening brace, so its new first statement loses the blank lines it starts with.
    /// </summary>
    private static CompilationUnitSyntax Remove(CompilationUnitSyntax root, IReadOnlyList<Run> runs)
    {
        var statements = runs.SelectMany(static run => run.Statements).ToList();
        var started = runs.Select(static run =>
                run.Statements[0].Parent is BlockSyntax block && block.Statements[0] == run.Statements[0] ? block : null
            )
            .OfType<BlockSyntax>()
            .ToList();
        var tracked = root.TrackNodes(statements.Concat<SyntaxNode>(started));
        var removed =
            tracked.RemoveNodes(
                statements.Select(statement => Current(tracked, statement)),
                SyntaxRemoveOptions.KeepNoTrivia
            ) ?? throw new InvalidOperationException("Failed to remove a run");
        return removed.ReplaceNodes(
            started.Select(block => Current(removed, block)),
            static (_, block) =>
                block.Statements is [var first, ..]
                    ? block.ReplaceNode(
                        first,
                        first.WithLeadingTrivia(WithoutLeadingBlankLines(first.GetLeadingTrivia()))
                    )
                    : block
        );
    }

    private static T Current<T>(CompilationUnitSyntax root, T original)
        where T : SyntaxNode =>
        root.GetCurrentNode(original) ?? throw new InvalidOperationException("Failed to track a node");

    /// <summary>
    /// The trivia without the blank lines it starts with: the whitespace and line breaks up to the last of those line
    /// breaks. The indentation stays, and so does a comment or directive line after the blank lines.
    /// </summary>
    private static SyntaxTriviaList WithoutLeadingBlankLines(SyntaxTriviaList trivia)
    {
        var blank = trivia
            .TakeWhile(static t => t.IsKind(SyntaxKind.WhitespaceTrivia) || t.IsKind(SyntaxKind.EndOfLineTrivia))
            .ToList();
        return SyntaxFactory.TriviaList(
            trivia.Skip(blank.FindLastIndex(static t => t.IsKind(SyntaxKind.EndOfLineTrivia)) + 1)
        );
    }

    /// <summary>
    /// A <c>ProcessDataRead</c> implementation, with the parameters the statements must refer to, taken by position.
    /// </summary>
    private sealed class Implementation(
        ScannedCSharpFile file,
        SemanticModel model,
        BlockSyntax body,
        IParameterSymbol instance,
        IParameterSymbol dataId,
        IParameterSymbol data
    )
    {
        /// <summary>
        /// The method, when it is the <c>ProcessDataRead</c> its class runs, the compilation sees all of its body, and
        /// it never writes the id or the data it is passed.
        /// </summary>
        public static Implementation? Of(
            ScannedCSharpFile scannedFile,
            SemanticModel semanticModel,
            MethodDeclarationSyntax declaration
        )
        {
            if (
                declaration.Body is not { } block
                || semanticModel.GetDeclaredSymbol(declaration)
                    is not { Parameters: [var first, var second, var third, ..] } method
                || !ImplementsProcessDataRead(method)
                || block
                    .DescendantTrivia(descendIntoTrivia: true)
                    .Any(static trivia => trivia.IsKind(SyntaxKind.DisabledTextTrivia))
            )
            {
                return null;
            }

            var implementation = new Implementation(scannedFile, semanticModel, block, first, second, third);
            return implementation.WritesItsArguments() ? null : implementation;
        }

        private bool WritesItsArguments() => IsWritten(dataId) || IsWritten(data);

        /// <summary>The runs in the blocks of the method itself, not of a lambda or local function in it.</summary>
        public IEnumerable<Run> Runs()
        {
            var blocks = body.DescendantNodesAndSelf(static node =>
                    node is not (AnonymousFunctionExpressionSyntax or LocalFunctionStatementSyntax)
                )
                .OfType<BlockSyntax>();
            foreach (var block in blocks)
            {
                var index = 0;
                while (index < block.Statements.Count)
                {
                    var run = MatchRun(block.Statements, index);
                    if (run is not null)
                    {
                        yield return run;
                    }

                    index += run?.Statements.Count ?? 1;
                }
            }
        }

        private Run? MatchRun(SyntaxList<StatementSyntax> statements, int start)
        {
            var calls = statements.Skip(start).Take(5).Select(AwaitedCall).ToList();
            if (
                calls is not [{ Declares: { } element } unlock, ..]
                || !IsDataClientCall(unlock.Call, "UnlockDataElement")
                || !IsElementBeingRead(Argument(unlock.Call, "dataGuid"))
            )
            {
                return null;
            }

            var writeIndex = IsUpdate(calls.ElementAtOrDefault(1), element) ? 2 : 1;
            if (
                MatchWrite(calls.ElementAtOrDefault(writeIndex), element) is not { } written
                || !IsLock(calls.ElementAtOrDefault(writeIndex + 1), element)
            )
            {
                return null;
            }

            var count = IsUpdate(calls.ElementAtOrDefault(writeIndex + 2), element) ? writeIndex + 3 : writeIndex + 2;
            var run = calls.Take(count).OfType<Awaited>().ToList();
            var span = TextSpan.FromBounds(run[0].Statement.SpanStart, run[^1].Statement.Span.End);
            if (
                (written.Form is { } form && IsWritten(form))
                || !References(element).All(name => span.Contains(name.Span))
                || run.Any(static call => call.DoesMore() || HasCommentOrDirective(call.Statement))
            )
            {
                return null;
            }

            return new Run(file, [.. run.Select(static call => call.Statement)], written.Form is null);
        }

        /// <summary>
        /// The statement as one awaited call: <c>await call;</c>, <c>local = await call;</c> or
        /// <c>T local = await call;</c>.
        /// </summary>
        private Awaited? AwaitedCall(StatementSyntax statement) =>
            model.GetOperation(statement) switch
            {
                IExpressionStatementOperation
                {
                    Operation: IAwaitOperation { Operation: IInvocationOperation call } awaiting,
                } operation => new Awaited(statement, operation, call, Declares: null, Assigns: null, [awaiting, call]),
                IExpressionStatementOperation
                {
                    Operation: ISimpleAssignmentOperation
                    {
                        Target: ILocalReferenceOperation target,
                        Value: IAwaitOperation { Operation: IInvocationOperation call } awaiting,
                    } assignment,
                } operation => new Awaited(
                    statement,
                    operation,
                    call,
                    Declares: null,
                    Assigns: target.Local,
                    [assignment, awaiting, call]
                ),
                IVariableDeclarationGroupOperation
                {
                    Declarations: [
                        {
                            Declarators: [
                                {
                                    Initializer.Value: IAwaitOperation { Operation: IInvocationOperation call } awaiting
                                } declarator,
                            ],
                        },
                    ],
                } operation => new Awaited(
                    statement,
                    operation,
                    call,
                    Declares: declarator.Symbol,
                    Assigns: null,
                    [awaiting, call]
                ),
                _ => null,
            };

        /// <summary>Whether the statement is <c>await dataClient.Update(instance, element);</c>.</summary>
        private bool IsUpdate(Awaited? statement, ILocalSymbol element) =>
            statement is { Declares: null, Assigns: null }
            && IsDataClientCall(statement.Call, "Update")
            && Refers(Argument(statement.Call, "instance"), instance)
            && Refers(Argument(statement.Call, "dataElement"), element);

        /// <summary>
        /// The write, when the statement is <c>await dataClient.UpdateData(form, …, dataId);</c> or
        /// <c>await dataClient.UpdateFormData(instance, form, element);</c>, where the latter may pass a <c>typeof</c>
        /// expression instead of the form.
        /// </summary>
        private Write? MatchWrite(Awaited? statement, ILocalSymbol element)
        {
            if (statement is not { Declares: null, Assigns: null })
            {
                return null;
            }

            var serialized = Argument(statement.Call, "dataToSerialize");
            if (IsDataClientCall(statement.Call, "UpdateData"))
            {
                return IsElementBeingRead(Argument(statement.Call, "dataId")) && Form(serialized) is { } form
                    ? new Write(form)
                    : null;
            }

            if (
                !IsDataClientCall(statement.Call, "UpdateFormData")
                || !Refers(Argument(statement.Call, "instance"), instance)
                || !Refers(Argument(statement.Call, "dataElement"), element)
            )
            {
                return null;
            }

            if (Form(serialized) is { } written)
            {
                return new Write(written);
            }

            return WithoutConversions(serialized) is ITypeOfOperation ? new Write(Form: null) : null;
        }

        /// <summary>
        /// Whether the statement is <c>await dataClient.LockDataElement(…, dataId);</c>, its result discarded or
        /// assigned to the element.
        /// </summary>
        private bool IsLock(Awaited? statement, ILocalSymbol element) =>
            statement is { Declares: null }
            && (statement.Assigns is null || Equal(statement.Assigns, element))
            && IsDataClientCall(statement.Call, "LockDataElement")
            && IsElementBeingRead(Argument(statement.Call, "dataGuid"));

        /// <summary>
        /// Whether the argument is the id of the element being read: <c>(Guid)dataId</c>, <c>dataId.Value</c> or
        /// <c>dataId!.Value</c>.
        /// </summary>
        private bool IsElementBeingRead(IOperation? argument) =>
            WithoutConversions(argument) switch
            {
                IPropertyReferenceOperation
                {
                    Property:
                    { Name: "Value", ContainingType.OriginalDefinition.SpecialType: SpecialType.System_Nullable_T },
                    Instance: var nullable,
                } => Refers(nullable, dataId),
                var value => Refers(value, dataId),
            };

        /// <summary>
        /// The form the argument passes: the data parameter, or a pattern variable on it, as <c>form</c> in
        /// <c>data is Model form</c>.
        /// </summary>
        private ISymbol? Form(IOperation? argument) =>
            WithoutConversions(argument) switch
            {
                IParameterReferenceOperation reference when Equal(reference.Parameter, data) => reference.Parameter,
                ILocalReferenceOperation reference when IsPatternOnData(reference.Local) => reference.Local,
                _ => null,
            };

        private bool IsPatternOnData(ILocalSymbol local) =>
            local.DeclaringSyntaxReferences is [var declaration]
            && declaration.GetSyntax()
                is SingleVariableDesignationSyntax
                {
                    Parent: DeclarationPatternSyntax { Parent: IsPatternExpressionSyntax pattern },
                }
            && Equal(model.GetSymbolInfo(pattern.Expression).Symbol, data);

        /// <summary>
        /// Whether the method assigns <paramref name="symbol"/>, increments it, or passes or takes it by reference.
        /// </summary>
        private bool IsWritten(ISymbol symbol) => References(symbol).Any(IsWrittenTo);

        /// <summary>The names in the method that refer to <paramref name="symbol"/>.</summary>
        private IEnumerable<IdentifierNameSyntax> References(ISymbol symbol) =>
            body.DescendantNodes()
                .OfType<IdentifierNameSyntax>()
                .Where(name =>
                    name.Identifier.ValueText == symbol.Name && Equal(model.GetSymbolInfo(name).Symbol, symbol)
                );

        /// <summary>
        /// Whether <paramref name="method"/> is the <c>IDataProcessor.ProcessDataRead</c> its class runs: the
        /// implementation of the interface member, or an override of it. A method that hides the implementation with
        /// <c>new</c> is not.
        /// </summary>
        private static bool ImplementsProcessDataRead(IMethodSymbol method) =>
            method
                .ContainingType.AllInterfaces.Where(static contract =>
                    contract.ToDisplayString() == DataProcessorName && CSharpSemanticQueries.IsAltinnAppSymbol(contract)
                )
                .SelectMany(static contract => contract.GetMembers("ProcessDataRead"))
                .Select(member => method.ContainingType.FindImplementationForInterfaceMember(member))
                .OfType<IMethodSymbol>()
                .Any(implementation => IsOrOverrides(method, implementation));

        private static bool IsOrOverrides(IMethodSymbol method, IMethodSymbol other)
        {
            for (IMethodSymbol? current = method; current is not null; current = current.OverriddenMethod)
            {
                if (Equal(current, other))
                {
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Whether the call binds to the <c>IDataClient</c> method <paramref name="name"/>, any overload.
        /// </summary>
        private static bool IsDataClientCall(IInvocationOperation call, string name)
        {
            var method = call.TargetMethod.OriginalDefinition;
            return method.Name == name
                && method.ContainingType.ToDisplayString() == DataClientName
                && CSharpSemanticQueries.IsAltinnAppSymbol(method);
        }

        /// <summary>
        /// The argument passed for the parameter <paramref name="parameterName"/>, named, positional or default.
        /// </summary>
        private static IOperation? Argument(IInvocationOperation call, string parameterName) =>
            call.Arguments.FirstOrDefault(argument => argument.Parameter?.Name == parameterName)?.Value;

        /// <summary>
        /// Whether the operation, without conversions, reads the parameter or local <paramref name="symbol"/>.
        /// </summary>
        private static bool Refers(IOperation? operation, ISymbol symbol) =>
            WithoutConversions(operation) switch
            {
                IParameterReferenceOperation reference => Equal(reference.Parameter, symbol),
                ILocalReferenceOperation reference => Equal(reference.Local, symbol),
                _ => false,
            };

        /// <summary>The operation without the built-in conversions around it, such as <c>(Guid)dataId</c>.</summary>
        private static IOperation? WithoutConversions(IOperation? operation)
        {
            while (operation is IConversionOperation { OperatorMethod: null } conversion)
            {
                operation = conversion.Operand;
            }

            return operation;
        }

        /// <summary>
        /// Whether the variable <paramref name="expression"/> names is written there: assigned or deconstructed into,
        /// incremented or decremented, passed as a <c>ref</c> or <c>out</c> argument, or taken by <c>ref</c>.
        /// </summary>
        private static bool IsWrittenTo(ExpressionSyntax expression) =>
            expression.Parent switch
            {
                ParenthesizedExpressionSyntax parenthesized => IsWrittenTo(parenthesized),
                AssignmentExpressionSyntax assignment => assignment.Left == expression,
                ArgumentSyntax argument => argument.RefKindKeyword.Kind()
                    is SyntaxKind.RefKeyword
                        or SyntaxKind.OutKeyword
                    || (argument.Parent is TupleExpressionSyntax tuple && IsWrittenTo(tuple)),
                RefExpressionSyntax => true,
                { } parent => parent.Kind()
                    is SyntaxKind.PreIncrementExpression
                        or SyntaxKind.PreDecrementExpression
                        or SyntaxKind.PostIncrementExpression
                        or SyntaxKind.PostDecrementExpression,
                _ => false,
            };

        /// <summary>
        /// Whether the statement holds a comment, which is the user's to keep, or a directive, which might pair with
        /// one outside the run. Its leading and trailing trivia count.
        /// </summary>
        private static bool HasCommentOrDirective(StatementSyntax statement) =>
            statement
                .DescendantTrivia(descendIntoTrivia: true)
                .Any(static trivia =>
                    trivia.IsDirective
                    || trivia.Kind()
                        is SyntaxKind.SingleLineCommentTrivia
                            or SyntaxKind.MultiLineCommentTrivia
                            or SyntaxKind.SingleLineDocumentationCommentTrivia
                            or SyntaxKind.MultiLineDocumentationCommentTrivia
                );

        private static bool Equal(ISymbol? symbol, ISymbol? other) =>
            SymbolEqualityComparer.Default.Equals(symbol, other);
    }

    /// <summary>
    /// A statement that awaits one call, possibly declaring or assigning a local with the result. <see cref="Parts"/>
    /// are the call, its await and the assignment: everything the statement may do.
    /// </summary>
    private sealed record Awaited(
        StatementSyntax Statement,
        IOperation Operation,
        IInvocationOperation Call,
        ILocalSymbol? Declares,
        ILocalSymbol? Assigns,
        IReadOnlyList<IOperation> Parts
    )
    {
        /// <summary>
        /// Whether the statement holds anything but its call, the await and assignment of the result, and plain values,
        /// such as an argument computed by a call or an interpolated string.
        /// </summary>
        public bool DoesMore() =>
            Operation.DescendantsAndSelf().Any(operation => !IsPlain(operation) && !Parts.Contains(operation));

        /// <summary>
        /// Whether the operation is the statement itself, the declaration of its local, an argument, or a plain
        /// value: a reference, a literal or default, a <c>typeof</c>, or a built-in conversion. Anything else might
        /// run code.
        /// </summary>
        private static bool IsPlain(IOperation operation) =>
            operation
                is IExpressionStatementOperation
                    or IVariableDeclarationGroupOperation
                    or IVariableDeclarationOperation
                    or IVariableDeclaratorOperation
                    or IVariableInitializerOperation
                    or IArgumentOperation
                    or ILocalReferenceOperation
                    or IParameterReferenceOperation
                    or IFieldReferenceOperation
                    or IInstanceReferenceOperation
                    or IPropertyReferenceOperation
                    or ILiteralOperation
                    or IDefaultValueOperation
                    or ITypeOfOperation
                    or IConversionOperation { OperatorMethod: null };
    }

    /// <summary>The form a write passes, or <c>null</c> when it passes a type instead.</summary>
    private sealed record Write(ISymbol? Form);

    /// <summary>The statements to remove, and whether the write among them passed a type instead of the data.</summary>
    private sealed record Run(ScannedCSharpFile File, IReadOnlyList<StatementSyntax> Statements, bool WritesType);
}
