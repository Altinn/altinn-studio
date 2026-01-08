namespace Altinn.App.Analyzers.SourceTextGenerator;

public static class SourceReaderUtils
{
    public static ITypeSymbol UnwrapNullable(ITypeSymbol symbol)
    {
        if (
            symbol is INamedTypeSymbol { OriginalDefinition.SpecialType: SpecialType.System_Nullable_T } namedTypeSymbol
        )
        {
            return namedTypeSymbol.TypeArguments[0];
        }
        if (symbol.NullableAnnotation == NullableAnnotation.Annotated)
        {
            return symbol.WithNullableAnnotation(NullableAnnotation.NotAnnotated);
        }

        return symbol;
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

    public static (ITypeSymbol, ITypeSymbol?) GetTypeFromProperty(ITypeSymbol propertyTypeSymbol)
    {
        var unwrappedTypeSymbol = UnwrapNullable(propertyTypeSymbol);

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
                    return (UnwrapNullable(collectionTypeSymbol.TypeArguments[0]), namedTypeSymbol);
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

        return (unwrappedTypeSymbol, null);
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
