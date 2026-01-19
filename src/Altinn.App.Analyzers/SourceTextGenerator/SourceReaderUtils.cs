namespace Altinn.App.Analyzers.SourceTextGenerator;

public static class SourceReaderUtils
{
    public static (ITypeSymbol UnwrappedSymbol, bool IsNullable) UnwrapNullable(ITypeSymbol symbol)
    {
        if (
            symbol is INamedTypeSymbol { OriginalDefinition.SpecialType: SpecialType.System_Nullable_T } namedTypeSymbol
        )
        {
            return (namedTypeSymbol.TypeArguments[0], true);
        }
        if (symbol.NullableAnnotation == NullableAnnotation.Annotated)
        {
            return (symbol.WithNullableAnnotation(NullableAnnotation.NotAnnotated), true);
        }

        return (symbol, false);
    }

    public static string? GetJsonName(IPropertySymbol symbol)
    {
        foreach (var attributeData in symbol.GetAttributes())
        {
            if (
                attributeData.AttributeClass is { Name: "JsonPropertyNameAttribute" } attr
                && attr.ContainingNamespace?.ToDisplayString() == "System.Text.Json.Serialization"
            )
            {
                var args = attributeData.ConstructorArguments;
                if (args.Length == 1 && args[0].Value is string jsonName)
                {
                    return jsonName;
                }
            }
        }

        return null;
    }

    private static readonly SymbolDisplayFormat _format = new(
        globalNamespaceStyle: SymbolDisplayGlobalNamespaceStyle.Included,
        typeQualificationStyle: SymbolDisplayTypeQualificationStyle.NameAndContainingTypesAndNamespaces,
        genericsOptions: SymbolDisplayGenericsOptions.IncludeTypeParameters,
        miscellaneousOptions: SymbolDisplayMiscellaneousOptions.UseSpecialTypes
            | SymbolDisplayMiscellaneousOptions.EscapeKeywordIdentifiers
            | SymbolDisplayMiscellaneousOptions.IncludeNullableReferenceTypeModifier
    );

    public static string TypeSymbolToString(ITypeSymbol typeSymbol)
    {
        return typeSymbol.ToDisplayString(_format);
    }

    public record PropertyTypeInfo(
        ITypeSymbol PropertyType,
        bool IsNullable,
        ITypeSymbol? PropertyCollectionType,
        bool IsNullableCollection
    )
    {
        public string PropertyTypeString => TypeSymbolToString(PropertyType);
        public string? PropertyCollectionTypeString =>
            PropertyCollectionType is null ? null : TypeSymbolToString(PropertyCollectionType);
    };

    public static PropertyTypeInfo GetTypeFromProperty(ITypeSymbol propertyTypeSymbol)
    {
        var (unwrappedTypeSymbol, isNullable) = UnwrapNullable(propertyTypeSymbol);

        switch (unwrappedTypeSymbol)
        {
            case INamedTypeSymbol { Arity: 1 } namedTypeSymbol:
                var collectionTypeSymbol = namedTypeSymbol.AllInterfaces.FirstOrDefault(i =>
                    i.MetadataName == "ICollection`1"
                    && i.ContainingNamespace.Name == "Generic"
                    && i.ContainingNamespace.ContainingNamespace.Name == "Collections"
                    && i.ContainingNamespace.ContainingNamespace.ContainingNamespace.Name == "System"
                    && i.ContainingNamespace
                        .ContainingNamespace
                        .ContainingNamespace
                        .ContainingNamespace
                        .IsGlobalNamespace
                );

                if (collectionTypeSymbol is not null)
                {
                    var (collectionValueProperty, isValueNullable) = UnwrapNullable(
                        collectionTypeSymbol.TypeArguments[0]
                    );
                    return new PropertyTypeInfo(
                        PropertyType: collectionValueProperty,
                        IsNullable: isValueNullable,
                        PropertyCollectionType: unwrappedTypeSymbol,
                        IsNullableCollection: isNullable
                    );
                }

                break;
            case IArrayTypeSymbol arrayTypeSymbol:
                // Arrays have never been supported in data models.
                // Just ignore them for now.
                // return (UnwrapNullable(arrayTypeSymbol.ElementType), arrayTypeSymbol);
                throw new NotSupportedException(
                    $"Array types are not supported. Type: {arrayTypeSymbol.ToDisplayString(_format)}"
                );
        }

        return new PropertyTypeInfo(unwrappedTypeSymbol, isNullable, null, false);
    }

    public static bool HasJsonIgnoreAttribute(IPropertySymbol property)
    {
        foreach (var attributeData in property.GetAttributes())
        {
            if (
                attributeData.AttributeClass is { Name: "JsonIgnoreAttribute" } attr
                && attr.ContainingNamespace?.ToDisplayString() == "System.Text.Json.Serialization"
            )
            {
                // Check for named arguments (e.g., Condition = ...)
                foreach (var namedArg in attributeData.NamedArguments)
                {
                    if (namedArg.Key == "Condition")
                    {
                        // If Condition is specified, only return true if it's Always (value 1)
                        // Never = 0, WhenWritingDefault = 2, WhenWritingNull = 3
                        if (namedArg.Value.Value is int conditionValue)
                        {
                            return conditionValue == 1; // JsonIgnoreCondition.Always
                        }
                    }
                }

                return true; // No Condition specified, so ignore unconditionally
            }
        }

        return false;
    }

    public static bool HasBindNeverAttribute(IPropertySymbol property)
    {
        foreach (var attributeData in property.GetAttributes())
        {
            if (
                attributeData.AttributeClass is { Name: "BindNeverAttribute" } attr
                && attr.ContainingNamespace?.ToDisplayString() == "Microsoft.AspNetCore.Mvc.ModelBinding"
            )
            {
                return true;
            }
        }

        return false;
    }
}
