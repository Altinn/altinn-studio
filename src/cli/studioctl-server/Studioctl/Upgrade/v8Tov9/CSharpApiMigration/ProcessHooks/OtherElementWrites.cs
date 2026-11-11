using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// A form read from one data type, changed, and written to another only. v8 read an object of its own, so the element
/// it was read from stayed as it was; the mutator's <c>GetFormData</c> returns the model the transition saves, so v9
/// saves the changes there too. The read and the write may each be a call to a helper that takes the data type.
/// </summary>
internal static class OtherElementWrites
{
    private static readonly HashSet<string> _formWrites = ["UpdateData", "UpdateFormData"];

    private sealed record FormRead(ILocalSymbol Model, string DataType, int End);

    private sealed record FormWrite(ILocalSymbol Model, string DataType, SyntaxNode Syntax);

    /// <summary>Reports each such write in <paramref name="rewrite"/>'s method with a to-do.</summary>
    /// <param name="rewrites">The rewrites of every method the transition reaches, after the helpers got the mutator.</param>
    public static void Plan(MethodRewrite rewrite, IReadOnlyDictionary<IMethodSymbol, MethodRewrite> rewrites)
    {
        var body = rewrite.Body.Operation;
        var reads = new List<FormRead>();
        var writes = new List<FormWrite>();
        foreach (var read in rewrite.MovedReads.Where(IsFormRead))
        {
            if (ReadSemantics.Variable(read.Invocation) is { } model && DataTypeOf(read) is { } dataType)
            {
                reads.Add(new FormRead(model, dataType, read.Syntax.Span.End));
            }
        }

        foreach (var call in body.DescendantsAndSelf().OfType<IInvocationOperation>())
        {
            if (
                StorageClientCall.From(call) is { } write
                && IsFormWrite(write)
                && Local(ReadSemantics.Model(write)) is { } own
                && DataTypeOf(write) is { } dataType
            )
            {
                // A write back that the rewrite removes counts too: in v8 it saved the changes as the others did.
                writes.Add(new FormWrite(own, dataType, call.Syntax));
                continue;
            }

            var callee = (call.TargetMethod.ReducedFrom ?? call.TargetMethod).OriginalDefinition;
            if (!rewrites.TryGetValue(callee, out var helper) || helper == rewrite)
            {
                continue;
            }

            if (
                ReadDataType(helper) is { } readDataType
                && Constant(call, readDataType) is { } read
                && ReadSemantics.Variable(call) is { } result
            )
            {
                reads.Add(new FormRead(result, read, call.Syntax.Span.End));
            }

            if (
                WriteParameters(helper) is var (model, writeDataType)
                && Local(Argument(call, model)) is { } written
                && Constant(call, writeDataType) is { } target
            )
            {
                writes.Add(new FormWrite(written, target, call.Syntax));
            }
        }

        foreach (var write in writes)
        {
            var read = reads.LastOrDefault(read =>
                SymbolEqualityComparer.Default.Equals(read.Model, write.Model) && read.End <= write.Syntax.SpanStart
            );
            if (read is null || ReadSemantics.Writes(body, write.Model).Count() != 1)
            {
                continue;
            }

            var changes = ReadSemantics
                .References(body, write.Model)
                .Where(reference =>
                    reference.Syntax.SpanStart > read.End
                    && reference.Syntax.SpanStart < write.Syntax.SpanStart
                    && ReadSemantics.IsAssignment(reference)
                )
                .ToList();
            if (changes.Count == 0)
            {
                continue;
            }

            // A write to the element it was read from after the changes saves them there in v8 too.
            var lastChange = changes.Max(static change => change.Syntax.SpanStart);
            if (
                writes.Any(other =>
                    SymbolEqualityComparer.Default.Equals(other.Model, write.Model)
                    && other.DataType == read.DataType
                    && other.Syntax.SpanStart > lastChange
                )
            )
            {
                continue;
            }

            rewrite.MovedTodo(
                write.Syntax,
                $"{write.Model.Name} is read from {read.DataType}, changed and written to {write.DataType}. v8 saved the "
                    + $"changes in {write.DataType} only; v9 saves them in {read.DataType} too, since "
                    + $"{rewrite.Mutator}.GetFormData returns the model the transition saves. To keep {read.DataType} as it "
                    + $"was, write {write.Model.Name} to {write.DataType} before changing it, and change the object "
                    + "ReplaceFormData returns."
            );
        }
    }

    private static bool IsFormRead(StorageClientCall call) =>
        call.Client == StorageClient.Data && call.Name == "GetFormData";

    private static bool IsFormWrite(StorageClientCall call) =>
        call.Client == StorageClient.Data && _formWrites.Contains(call.Name);

    /// <summary>The data type parameter of a helper that returns the one form it reads.</summary>
    private static IParameterSymbol? ReadDataType(MethodRewrite helper)
    {
        if (
            helper.MovedReads.Where(IsFormRead).ToList() is not [var read]
            || DataTypeOperand(read) is not IParameterReferenceOperation dataType
        )
        {
            return null;
        }

        var model = ReadSemantics.Variable(read.Invocation);
        var returned = helper
            .Body.Operation.DescendantsAndSelf()
            .OfType<IReturnOperation>()
            .Select(static result => result.ReturnedValue)
            .OfType<IOperation>()
            .Select(Returned)
            .Any(value =>
                value == read.Invocation
                || model is not null
                    && value is ILocalReferenceOperation local
                    && SymbolEqualityComparer.Default.Equals(local.Local, model)
            );
        return returned ? dataType.Parameter : null;
    }

    /// <summary>The model and data type parameters of a helper that writes one form, the model it is given.</summary>
    private static (IParameterSymbol Model, IParameterSymbol DataType)? WriteParameters(MethodRewrite helper)
    {
        if (
            helper.MovedWrites.Where(IsFormWrite).ToList() is [var write]
            && ReadSemantics.Model(write) is { } model
            && ReadSemantics.Unwrapped(model) is IParameterReferenceOperation written
            && DataTypeOperand(write) is IParameterReferenceOperation dataType
        )
        {
            return (written.Parameter, dataType.Parameter);
        }

        return null;
    }

    /// <summary>The value a return gives, under <c>await</c>, casts and the left side of <c>??</c>.</summary>
    private static IOperation Returned(IOperation value)
    {
        while (true)
        {
            switch (value)
            {
                case IAwaitOperation awaited:
                    value = awaited.Operation;
                    continue;
                case IConversionOperation conversion:
                    value = conversion.Operand;
                    continue;
                case IParenthesizedOperation parenthesized:
                    value = parenthesized.Operand;
                    continue;
                case ICoalesceOperation coalesce:
                    value = coalesce.Value;
                    continue;
                default:
                    return value;
            }
        }
    }

    private static string? DataTypeOf(StorageClientCall call) =>
        DataTypeOperand(call)?.ConstantValue is { HasValue: true, Value: string dataType } ? dataType : null;

    /// <summary>What the lookup of the call's element compares <c>DataType</c> with.</summary>
    private static IOperation? DataTypeOperand(StorageClientCall call) =>
        StorageCallRewriter.Element(call) is { } element
            ? StorageCallRewriter.LookedUpBy(element).Select(ReadSemantics.Unwrapped).FirstOrDefault()
            : null;

    private static IOperation? Argument(IInvocationOperation call, IParameterSymbol parameter) =>
        call.Arguments.FirstOrDefault(argument => argument.Parameter?.Ordinal == parameter.Ordinal)?.Value;

    private static string? Constant(IInvocationOperation call, IParameterSymbol parameter) =>
        Argument(call, parameter)?.ConstantValue is { HasValue: true, Value: string constant } ? constant : null;

    private static ILocalSymbol? Local(IOperation? operation) =>
        operation is not null && ReadSemantics.Unwrapped(operation) is ILocalReferenceOperation local
            ? local.Local
            : null;
}
