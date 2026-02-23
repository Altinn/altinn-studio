using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.DataProcessingRules;

/// <summary>
/// Resolves C# types for JSON paths in data models by parsing source code with Roslyn
/// </summary>
internal sealed class DataModelTypeResolver
{
    private readonly string _appBasePath;
    private INamedTypeSymbol? _rootDataModelType;
    private SemanticModel? _semanticModel;

    public DataModelTypeResolver(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Load the data model type from source files using Roslyn
    /// </summary>
    /// <param name="dataModelInfo">Information about the data model to load</param>
    /// <returns>True if the type was loaded successfully</returns>
    public bool LoadDataModelType(DataModelInfo dataModelInfo)
    {
        try
        {
            // Find the model source file
            var modelFile = FindModelSourceFile(dataModelInfo);
            if (modelFile == null)
            {
                return false;
            }

            // Parse the source file
            var tree = Microsoft.CodeAnalysis.CSharp.CSharpSyntaxTree.ParseText(File.ReadAllText(modelFile));

            // Create a compilation to get semantic information
            // Add all necessary assembly references so Roslyn can resolve attribute constructor arguments
            // We need to add core runtime assemblies for Roslyn to properly resolve types
            var coreAssemblyPath = Path.GetDirectoryName(typeof(object).Assembly.Location);
            if (coreAssemblyPath == null)
            {
                return false;
            }

            var references = new List<MetadataReference>
            {
                MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(System.Collections.Generic.List<>).Assembly.Location),
                MetadataReference.CreateFromFile(
                    typeof(System.Text.Json.Serialization.JsonPropertyNameAttribute).Assembly.Location
                ),
            };

            // Add System.Runtime - CRITICAL for resolving Attribute, Type, Enum, and other base classes
            var systemRuntimePath = Path.Combine(coreAssemblyPath, "System.Runtime.dll");
            if (File.Exists(systemRuntimePath))
            {
                references.Add(MetadataReference.CreateFromFile(systemRuntimePath));
            }

            // Add System.Linq for LINQ support
            var systemLinqPath = Path.Combine(coreAssemblyPath, "System.Linq.dll");
            if (File.Exists(systemLinqPath))
            {
                references.Add(MetadataReference.CreateFromFile(systemLinqPath));
            }

            // Add Newtonsoft.Json if available
            try
            {
                var newtonsoftAssembly = typeof(Newtonsoft.Json.JsonPropertyAttribute).Assembly;
                references.Add(MetadataReference.CreateFromFile(newtonsoftAssembly.Location));
            }
            catch
            {
                // Newtonsoft.Json not available, skip
            }

            // Add System.ComponentModel.DataAnnotations
            try
            {
                var dataAnnotationsAssembly = typeof(System.ComponentModel.DataAnnotations.RangeAttribute).Assembly;
                references.Add(MetadataReference.CreateFromFile(dataAnnotationsAssembly.Location));
            }
            catch
            {
                // DataAnnotations not available, skip
            }

            // Add System.Xml
            try
            {
                var xmlAssembly = typeof(System.Xml.Serialization.XmlElementAttribute).Assembly;
                references.Add(MetadataReference.CreateFromFile(xmlAssembly.Location));
            }
            catch
            {
                // System.Xml not available, skip
            }

            var compilation = Microsoft.CodeAnalysis.CSharp.CSharpCompilation.Create(
                "TempAssembly",
                syntaxTrees: new[] { tree },
                references: references
            );

            _semanticModel = compilation.GetSemanticModel(tree);

            // Find the root data model class
            var root = tree.GetRoot();
            var classDeclarations = root.DescendantNodes().OfType<ClassDeclarationSyntax>();

            foreach (var classDecl in classDeclarations)
            {
                var symbol = _semanticModel.GetDeclaredSymbol(classDecl) as INamedTypeSymbol;
                if (symbol != null && symbol.ToDisplayString() == dataModelInfo.FullClassRef)
                {
                    _rootDataModelType = symbol;
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Warning] Failed to load data model type from source: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Resolve the C# type for a given JSON path (e.g., "InternInfo.raNummer" -> "string")
    /// </summary>
    /// <param name="jsonPath">The JSON path using dot notation (e.g., "field.subfield" or "list[0].field")</param>
    /// <returns>The C# type name, or null if the type could not be resolved</returns>
    public string? ResolveType(string jsonPath)
    {
        if (_rootDataModelType == null || _semanticModel == null)
        {
            return null;
        }

        try
        {
            // Split the path by dots, handling array indexes
            var pathSegments = SplitJsonPath(jsonPath);
            ITypeSymbol? currentType = _rootDataModelType;

            for (int i = 0; i < pathSegments.Length; i++)
            {
                var segment = pathSegments[i];

                if (currentType == null)
                {
                    return null;
                }

                // Remove array index notation if present (e.g., "items[0]" -> "items")
                var propertyName = StripArrayIndex(segment);

                // Find the property by JSON property name or C# property name
                var property = FindPropertyByJsonName(currentType, propertyName);
                if (property == null)
                {
                    return null;
                }

                currentType = property.Type;

                // If this is a collection, get the element type
                if (IsCollectionType(currentType, out var elementType))
                {
                    currentType = elementType;
                }
            }

            // Return the friendly type name
            return currentType != null ? GetFriendlyTypeName(currentType) : null;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>
    /// Get a friendly C# type name suitable for code generation
    /// </summary>
    private string GetFriendlyTypeName(ITypeSymbol type)
    {
        // Handle nullable value types
        if (type is INamedTypeSymbol namedType && namedType.IsGenericType)
        {
            var typeDef = namedType.ConstructedFrom;
            if (typeDef.SpecialType == SpecialType.System_Nullable_T)
            {
                var underlyingType = namedType.TypeArguments[0];
                return GetFriendlyTypeName(underlyingType) + "?";
            }
        }

        // Handle common types
        switch (type.SpecialType)
        {
            case SpecialType.System_String:
                return "string?";
            case SpecialType.System_Int32:
                return "int";
            case SpecialType.System_Int64:
                return "long";
            case SpecialType.System_Decimal:
                return "decimal";
            case SpecialType.System_Double:
                return "double";
            case SpecialType.System_Single:
                return "float";
            case SpecialType.System_Boolean:
                return "bool";
        }

        // Check for DateTime and Guid
        var fullName = type.ToDisplayString();
        if (fullName == "System.DateTime")
            return "DateTime";
        if (fullName == "System.Guid")
            return "Guid";

        // For value types, return without nullable marker
        if (type.IsValueType)
        {
            return type.Name;
        }

        // For reference types (classes), add nullable marker
        return type.Name + "?";
    }

    /// <summary>
    /// Find a property by its JSON property name (using JsonPropertyName attribute) or C# name
    /// </summary>
    private IPropertySymbol? FindPropertyByJsonName(ITypeSymbol type, string jsonName)
    {
        var properties = type.GetMembers().OfType<IPropertySymbol>();

        foreach (var property in properties)
        {
            // Check JsonPropertyName attribute (System.Text.Json)
            foreach (var attr in property.GetAttributes())
            {
                if (attr.AttributeClass?.Name == "JsonPropertyNameAttribute")
                {
                    var attrValue = attr.ConstructorArguments.FirstOrDefault().Value as string;
                    if (attrValue == jsonName)
                    {
                        return property;
                    }
                }

                // Check Newtonsoft.Json.JsonPropertyAttribute
                if (attr.AttributeClass?.Name == "JsonPropertyAttribute")
                {
                    var attrValue = attr.ConstructorArguments.FirstOrDefault().Value as string;
                    if (attrValue == jsonName)
                    {
                        return property;
                    }
                }
            }

            // Fallback to C# property name
            if (property.Name == jsonName)
            {
                return property;
            }
        }

        return null;
    }

    /// <summary>
    /// Check if a type is a collection and get its element type
    /// </summary>
    private bool IsCollectionType(ITypeSymbol type, out ITypeSymbol? elementType)
    {
        // Check for List<T>
        if (type is INamedTypeSymbol namedType)
        {
            if (namedType.IsGenericType)
            {
                var typeDef = namedType.ConstructedFrom.ToDisplayString();
                if (typeDef == "System.Collections.Generic.List<T>")
                {
                    elementType = namedType.TypeArguments[0];
                    return true;
                }
            }

            // Check for ICollection<T>
            foreach (var iface in namedType.AllInterfaces)
            {
                if (iface.IsGenericType)
                {
                    var ifaceTypeDef = iface.ConstructedFrom.ToDisplayString();
                    if (ifaceTypeDef == "System.Collections.Generic.ICollection<T>")
                    {
                        elementType = iface.TypeArguments[0];
                        return true;
                    }
                }
            }
        }

        elementType = null;
        return false;
    }

    /// <summary>
    /// Split a JSON path by dots, preserving array indexes
    /// </summary>
    private string[] SplitJsonPath(string path)
    {
        return path.Split('.');
    }

    /// <summary>
    /// Remove array index notation from a property name (e.g., "items[0]" -> "items")
    /// </summary>
    private string StripArrayIndex(string segment)
    {
        var bracketIndex = segment.IndexOf('[');
        return bracketIndex >= 0 ? segment[..bracketIndex] : segment;
    }

    /// <summary>
    /// Find the model source file (.cs file in App/models/)
    /// </summary>
    private string? FindModelSourceFile(DataModelInfo dataModelInfo)
    {
        var modelsDir = Path.Combine(_appBasePath, "App", "models");
        if (!Directory.Exists(modelsDir))
        {
            Console.WriteLine($"[Warning] Models directory not found: {modelsDir}");
            return null;
        }

        // Look for .cs files in the models directory
        var csFiles = Directory.GetFiles(modelsDir, "*.cs", SearchOption.AllDirectories);

        // Try to find the file by class name
        var className = dataModelInfo.ClassName;
        if (className != null)
        {
            foreach (var file in csFiles)
            {
                var content = File.ReadAllText(file);
                // Simple heuristic: check if the file contains "class {ClassName}"
                if (content.Contains($"class {className}"))
                {
                    return file;
                }
            }
        }

        // Fallback: use the first .cs file if there's only one
        if (csFiles.Length == 1)
        {
            return csFiles[0];
        }

        Console.WriteLine($"[Warning] Could not find model source file for class '{className}'");
        return null;
    }
}
