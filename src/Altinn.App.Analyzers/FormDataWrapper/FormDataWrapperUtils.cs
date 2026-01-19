using Altinn.App.Analyzers.SourceTextGenerator;
using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers;

public static class FormDataWrapperUtils
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

        var propertyTypeInfo = SourceReaderUtils.GetTypeFromProperty(rootSymbol);

        return new ModelPathNode(
            "",
            "",
            propertyTypeInfo.PropertyTypeString,
            propertyTypeInfo.IsNullable,
            GetNodeProperties(rootSymbol, diagnostics)
        );
    }

    private static ModelPathNode[]? GetNodeProperties(ITypeSymbol typeSymbol, List<Diagnostic> diagnostics)
    {
        if (typeSymbol is not INamedTypeSymbol namedTypeSymbol)
        {
            return null;
        }

        // If this is a JSON value type, we do not want to explore its properties
        if (IsJsonValueType(namedTypeSymbol.ContainingNamespace?.ToDisplayString(), namedTypeSymbol.Name))
        {
            return null;
        }

        var nodeProperties = new List<ModelPathNode>();
        foreach (var property in namedTypeSymbol.GetMembers().OfType<IPropertySymbol>())
        {
            if (PropertyShouldBeSkipped(property))
            {
                // Skip static, readonly, writeonly, implicitly declared, private and indexer properties
                continue;
            }
            var propertyTypeInfo = SourceReaderUtils.GetTypeFromProperty(property.Type);

            var cSharpName = property.Name;
            var jsonName = SourceReaderUtils.GetJsonName(property) ?? cSharpName;

            var subProperties = GetNodeProperties(propertyTypeInfo.PropertyType, diagnostics);

            nodeProperties.Add(
                new ModelPathNode(
                    cSharpName,
                    jsonName,
                    propertyTypeInfo.PropertyTypeString,
                    propertyTypeInfo.IsNullable,
                    subProperties,
                    propertyTypeInfo.PropertyCollectionTypeString,
                    propertyTypeInfo.IsNullableCollection
                )
            );
        }
        return nodeProperties.ToArray();
    }

    /// <summary>
    /// Determine if the given symbol represents something that System.Text.Json can serialize as a JSON value
    /// (primitive types, string, DateTime, Guid, Uri)
    /// </summary>
    /// <remarks>
    /// Based on https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/supported-types#supported-key-types
    /// </remarks>
    public static bool IsJsonValueType(string? ns, string name) =>
        ns switch
        {
            "System"
                when name
                    is "Boolean"
                        or "Byte"
                        or "DateTime"
                        or "DateTimeOffset"
                        or "Decimal"
                        or "Double"
                        or "Enum"
                        or "Guid"
                        or "Int16"
                        or "Int32"
                        or "Int64"
                        or "SByte"
                        or "Single"
                        or "String"
                        or "TimeSpan"
                        or "UInt16"
                        or "UInt32"
                        or "UInt64"
                        or "Uri"
                        or "Version" => true,
            // "System.Text.Json" when name is "JsonElement" or "JsonDocument" => true,
            // "System.Text.Json.Nodes" when name is "JsonNode" => true,
            _ => false,
        };

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
        if (SourceReaderUtils.UnwrapNullable(property.Type).UnwrappedSymbol is INamedTypeSymbol { IsAbstract: true })
        {
            return true;
        }

        // Skip properties with [JsonIgnore]
        if (SourceReaderUtils.HasJsonIgnoreAttribute(property))
        {
            return true;
        }

        // Skip properties with [BindNever]
        // TODO: Theese could be made "read-only", but skipping them for now as there has not been a use-case yet
        if (SourceReaderUtils.HasBindNeverAttribute(property))
        {
            return true;
        }

        return false;
    }
}
