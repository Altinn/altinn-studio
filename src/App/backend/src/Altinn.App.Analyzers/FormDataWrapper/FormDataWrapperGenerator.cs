namespace Altinn.App.Analyzers;

/// <summary>
/// Generate IFormDataWrapper implementations for classes in models/*.cs in the app.
/// </summary>
[Generator]
public class FormDataWrapperGenerator : IIncrementalGenerator
{
    /// <inheritdoc />
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        var isAltinnApp = context.AnalyzerConfigOptionsProvider.Select(static (provider, _) => provider.IsAltinnApp());

        var rootClasses = context
            .AdditionalTextsProvider.Where(FormDataWrapperUtils.IsApplicationMetadataFile)
            .Combine(isAltinnApp)
            .Where(static tuple => tuple.Right)
            .Select(static (tuple, _) => tuple.Left)
            .SelectMany(ExtractRootClassesFromAppMetadata);

        var modelPathNodesProvider = rootClasses.Combine(context.CompilationProvider).Select(CreateNodeTree);

        context.RegisterSourceOutput(modelPathNodesProvider, GenerateFromNode);
    }

    private static IEnumerable<string> ExtractRootClassesFromAppMetadata(
        AdditionalText additionalText,
        CancellationToken ct
    )
    {
        var result = FormDataWrapperUtils.ParseModelClassOrDiagnostic(additionalText, ct);
        return result.Select(t => t.classFullName);
    }

    private static ModelPathNode? CreateNodeTree((string, Compilation) tuple, CancellationToken ct)
    {
        var (classFullName, compilation) = tuple;

        return FormDataWrapperUtils.CreateRootSymbolNode(classFullName, compilation, []);
    }

    private static void GenerateFromNode(SourceProductionContext context, ModelPathNode? node)
    {
        if (node is null)
        {
            return;
        }
        var sourceText = SourceTextGenerator.SourceTextGenerator.GenerateSourceText(node);
        context.AddSource(node.Name.Split('_').Last() + "FormDataWrapper.g.cs", sourceText);
    }
}
