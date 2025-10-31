using Altinn.App.Analyzers.SourceTextGenerator;
using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers;

internal static class FormDataWrapperUtils
{
    public static bool IsApplicationMetadataFile(AdditionalText text)
    {
        return text.Path.Replace('\\', '/').EndsWith("config/applicationmetadata.json");
    }

    public static IEnumerable<(string classFullName, Location classLocation)> ParseModelClassOrDiagnostic(
        AdditionalText text,
        CancellationToken token,
        List<Diagnostic>? diagnostics = null
    )
    {
        var rootClasses = new List<(string classFullName, Location classLocation)>();
        try
        {
            var textContent = text.GetText(token)?.ToString();
            if (textContent is null)
            {
                diagnostics?.Add(
                    Diagnostic.Create(
                        Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                        FileLocationHelper.GetLocation(text, 0, null),
                        ["Failed to read"]
                    )
                );
                return rootClasses;
            }

            var appMetadata = JsonValue.Parse(textContent);
            if (appMetadata.Type != JsonType.Object)
            {
                diagnostics?.Add(
                    Diagnostic.Create(
                        Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                        FileLocationHelper.GetLocation(text, appMetadata.Start, appMetadata.End),
                        ["not a valid JSON object"]
                    )
                );
                return rootClasses;
            }

            var dataTypes = appMetadata.GetProperty("dataTypes");
            if (dataTypes?.Type != JsonType.Array)
            {
                diagnostics?.Add(
                    Diagnostic.Create(
                        Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                        FileLocationHelper.GetLocation(text, appMetadata.Start, appMetadata.End),
                        ["the property dataTypes is not a valid JSON array"]
                    )
                );
                return rootClasses;
            }

            foreach (var dataType in dataTypes.GetArrayValues())
            {
                if (dataType.Type != JsonType.Object)
                {
                    diagnostics?.Add(
                        Diagnostic.Create(
                            Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                            FileLocationHelper.GetLocation(text, appMetadata.Start, appMetadata.End),
                            ["an entry in dataTypes is not a JSON object"]
                        )
                    );
                    continue;
                }

                var appLogic = dataType.GetProperty("appLogic");
                if (appLogic == null)
                {
                    continue;
                }
                if (appLogic.Type != JsonType.Object)
                {
                    diagnostics?.Add(
                        Diagnostic.Create(
                            Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                            FileLocationHelper.GetLocation(text, appMetadata.Start, appMetadata.End),
                            ["dataTypes.appLogic is not a valid JSON object"]
                        )
                    );
                    continue;
                }

                var classRef = appLogic.GetProperty("classRef");
                if (classRef?.Type != JsonType.String)
                {
                    continue;
                }

                rootClasses.Add(
                    new(classRef.GetString(), FileLocationHelper.GetLocation(text, classRef.Start, classRef.End))
                );
            }
        }
        catch (NanoJsonException e)
        {
            diagnostics?.Add(
                Diagnostic.Create(
                    Diagnostics.FormDataWrapperGenerator.AppMetadataError,
                    FileLocationHelper.GetLocation(text, e.StartIndex, e.EndIndex),
                    [e.Message]
                )
            );
        }
        return rootClasses;
    }

    public sealed record Result<T>(T? Value, List<Diagnostic> Diagnostics)
        where T : class
    {
        public Result(Diagnostic diagnostics)
            : this(null, [diagnostics]) { }

        public Result(T value)
            : this(value, []) { }
    };

    public sealed record ModelClassOrDiagnostic(string? ClassName, Location? Location, List<Diagnostic> Diagnostics)
    {
        public ModelClassOrDiagnostic(Diagnostic diagnostic)
            : this(null, null, new([diagnostic])) { }

        public ModelClassOrDiagnostic(string className, Location? location)
            : this(className, location, []) { }
    };

    public static ModelPathNode? CreateRootSymbolNode(
        string classFullName,
        Compilation compilation,
        List<Diagnostic> diagnostics
    )
    {
        var rootSymbol = compilation.GetBestTypeByMetadataName(classFullName);
        if (rootSymbol == null)
        {
            return null;
        }

        return new ModelPathNode(
            "",
            "",
            SourceReaderUtils.TypeSymbolToString(rootSymbol),
            GetNodeProperties(rootSymbol, diagnostics)
        );
    }

    public static EquatableArray<ModelPathNode>? GetNodeProperties(
        INamedTypeSymbol namedTypeSymbol,
        List<Diagnostic> diagnostics
    )
    {
        var nodeProperties = new List<ModelPathNode>();
        foreach (var property in namedTypeSymbol.GetMembers().OfType<IPropertySymbol>())
        {
            if (PropertyShouldBeSkipped(property))
            {
                // Skip static, readonly, writeonly, implicitly declared, private and indexer properties
                continue;
            }
            var (propertyTypeSymbol, propertyCollectionTypeSymbol) = SourceReaderUtils.GetTypeFromProperty(
                property.Type
            );

            var cSharpName = property.Name;
            var jsonName = SourceReaderUtils.GetJsonName(property) ?? cSharpName;
            var typeString = SourceReaderUtils.TypeSymbolToString(propertyTypeSymbol);
            var collectionTypeString = propertyCollectionTypeSymbol is null
                ? null
                : SourceReaderUtils.TypeSymbolToString(propertyCollectionTypeSymbol);

            if (
                propertyTypeSymbol is INamedTypeSymbol propertyNamedTypeSymbol
                && !propertyNamedTypeSymbol.ContainingNamespace.ToString().StartsWith("System")
            )
            {
                nodeProperties.Add(
                    new ModelPathNode(
                        cSharpName,
                        jsonName,
                        typeString,
                        GetNodeProperties(propertyNamedTypeSymbol, diagnostics),
                        collectionTypeString
                    )
                );
            }
            else
            {
                nodeProperties.Add(new ModelPathNode(cSharpName, jsonName, typeString, null, collectionTypeString));
            }
        }
        return nodeProperties;
    }

    private static bool PropertyShouldBeSkipped(IPropertySymbol property)
    {
        // Skip static, readonly, writeonly, implicitly declared, private and indexer properties
        if (
            property.IsStatic
            || property.IsReadOnly
            || property.IsWriteOnly
            || property.IsImplicitlyDeclared
            || property.IsIndexer
            || (
                property.DeclaredAccessibility is not Accessibility.Public
                && property.DeclaredAccessibility is not Accessibility.Internal
            )
        )
        {
            return true;
        }

        // Skip properties of abstract types (cannot be instantiated)
        if (SourceReaderUtils.UnwrapNullable(property.Type) is INamedTypeSymbol { IsAbstract: true })
        {
            return true;
        }

        return false;
    }
}
