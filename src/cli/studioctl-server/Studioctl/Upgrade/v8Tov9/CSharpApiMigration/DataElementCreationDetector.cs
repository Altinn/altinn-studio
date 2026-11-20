using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Operations;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// The data types the app's code creates data elements of, found from its calls to the v8 APIs that create one:
/// <c>IDataClient.InsertFormData</c> and <c>InsertBinaryData</c>, <c>IInstanceDataMutator.AddFormDataElement</c> and
/// <c>AddBinaryDataElement</c>, and <c>IDataService.InsertJsonObject</c>.
/// </summary>
/// <param name="DataTypes">The data types the calls name with a compile-time constant.</param>
/// <param name="UnknownDataTypes">
/// The calls whose data type is not a compile-time constant, so could be any data type.
/// </param>
internal sealed record CodeCreatedDataTypes(
    IReadOnlySet<string> DataTypes,
    IReadOnlyList<CSharpApiMatch> UnknownDataTypes
);

/// <summary>
/// Finds <see cref="CodeCreatedDataTypes"/>. With a semantic model a call counts when it binds to an Altinn.App
/// method. Without one, a call counts by its method name, and only a string literal names its data type.
/// </summary>
internal sealed class DataElementCreationDetector
{
    private static readonly IReadOnlySet<string> _creatingMethods = new HashSet<string>(StringComparer.Ordinal)
    {
        "InsertFormData",
        "InsertBinaryData",
        "AddFormDataElement",
        "AddBinaryDataElement",
        "InsertJsonObject",
    };

    /// <summary>The names the creating methods' data type parameter has across their v8 overloads.</summary>
    private static readonly IReadOnlySet<string> _dataTypeParameters = new HashSet<string>(StringComparer.Ordinal)
    {
        "dataType",
        "dataTypeString",
        "dataTypeId",
    };

    /// <summary>
    /// The position of the data type in every overload of a creating method, where they agree. The overloads of
    /// <c>InsertFormData</c> and <c>InsertBinaryData</c> put it in different places.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, int> _dataTypePositions = new Dictionary<string, int>(
        StringComparer.Ordinal
    )
    {
        ["AddFormDataElement"] = 0,
        ["AddBinaryDataElement"] = 0,
        ["InsertJsonObject"] = 1,
    };

    private readonly CSharpSourceScanner _scanner;

    public DataElementCreationDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public CodeCreatedDataTypes Detect()
    {
        var dataTypes = new HashSet<string>(StringComparer.Ordinal);
        var unknown = new List<CSharpApiMatch>();
        foreach (var file in _scanner.Files)
        {
            foreach (var invocation in file.Root.DescendantNodes().OfType<InvocationExpressionSyntax>())
            {
                var name = CSharpSemanticQueries.InvokedName(invocation);
                if (name is null || !_creatingMethods.Contains(name.Identifier.Text))
                    continue;

                var (creates, dataType) = file.SemanticModel is { } semanticModel
                    ? SemanticDataType(semanticModel, invocation)
                    : (true, SyntaxDataType(name.Identifier.Text, invocation.ArgumentList));
                if (!creates)
                    continue;

                if (dataType is not null)
                    dataTypes.Add(dataType);
                else
                    unknown.Add(new CSharpApiMatch(file.RelativePath, file.GetLine(name), name.Identifier.Text));
            }
        }

        return new CodeCreatedDataTypes(dataTypes, unknown);
    }

    /// <summary>
    /// Whether the call creates a data element, which it does when it binds to an Altinn.App method, and the
    /// constant data type it names, if any. A call that does not bind is judged by its syntax.
    /// </summary>
    private static (bool Creates, string? DataType) SemanticDataType(
        SemanticModel semanticModel,
        InvocationExpressionSyntax invocation
    )
    {
        if (semanticModel.GetSymbolInfo(invocation).Symbol is not IMethodSymbol method)
        {
            var name = CSharpSemanticQueries.InvokedName(invocation)?.Identifier.Text ?? "";
            return (true, SyntaxDataType(name, invocation.ArgumentList));
        }

        if (!CSharpSemanticQueries.IsAltinnAppSymbol(method.ReducedFrom ?? method))
            return (false, null);

        var argument = (semanticModel.GetOperation(invocation) as IInvocationOperation)?.Arguments.FirstOrDefault(
            argument => argument.Parameter is { } parameter && _dataTypeParameters.Contains(parameter.Name)
        );
        return
            argument is { Parameter.Type.SpecialType: SpecialType.System_String }
            && argument.Value.ConstantValue is { HasValue: true, Value: string dataType }
            ? (true, dataType)
            : (true, null);
    }

    /// <summary>
    /// The string literal a call passes as the data type: a named argument, or the argument at the position every
    /// overload of the method has its data type in. Null when it is anything else.
    /// </summary>
    private static string? SyntaxDataType(string method, ArgumentListSyntax arguments)
    {
        var list = arguments.Arguments;
        var expression =
            list.FirstOrDefault(a =>
                a.NameColon is { } nameColon && _dataTypeParameters.Contains(nameColon.Name.Identifier.Text)
            )?.Expression
            ?? (
                _dataTypePositions.TryGetValue(method, out var index)
                && index < list.Count
                && list[index].NameColon is null
                    ? list[index].Expression
                    : null
            );
        return expression is LiteralExpressionSyntax { Token.Value: string dataType } ? dataType : null;
    }
}
