using System.Linq;
using Altinn.App.Core.Models;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.Designer.Exceptions.DataModeling;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// The C# class of an app's data model, as the class reference of its data type in the application metadata
/// names it.
/// </summary>
internal static class DataModelClassRef
{
    /// <summary>
    /// Gets the class reference that a data model with the root type gets.
    /// </summary>
    /// <param name="applicationMetadata">The app's application metadata.</param>
    /// <param name="typeName">The data model's root type name, which is also its C# class name.</param>
    public static string Get(ApplicationMetadata applicationMetadata, string typeName) =>
        HasOwnNamespace(applicationMetadata, typeName) ? InOwnNamespace(typeName) : InSharedNamespace(typeName);

    /// <summary>
    /// Gets whether a data model with the root type gets a namespace of its own. It does, unless a data type has
    /// the class in the namespace that the app's data models share.
    /// </summary>
    /// <param name="applicationMetadata">The app's application metadata.</param>
    /// <param name="typeName">The data model's root type name, which is also its C# class name.</param>
    public static bool HasOwnNamespace(ApplicationMetadata applicationMetadata, string typeName)
    {
        string inSharedNamespace = InSharedNamespace(typeName);
        return (applicationMetadata.DataTypes ?? []).All(dataType => dataType.AppLogic?.ClassRef != inSharedNamespace);
    }

    /// <summary>
    /// Refuses a data model whose C# class another data type has. Both models' C# files would declare the class,
    /// so the app would not build.
    /// </summary>
    /// <param name="applicationMetadata">The app's application metadata.</param>
    /// <param name="typeName">The data model's root type name, which is also its C# class name.</param>
    /// <param name="replacedDataTypeId">
    /// The data type that the data model replaces, or null when the data model replaces none. Data types with the
    /// replaced data type's class use its C# file, so their class does not count.
    /// </param>
    /// <exception cref="ModelWithTheSameBaseTypeAlreadyExists">Another data type has the class.</exception>
    public static void ThrowIfAnotherDataTypeHasClass(
        ApplicationMetadata applicationMetadata,
        string typeName,
        string? replacedDataTypeId
    )
    {
        var dataTypes = applicationMetadata.DataTypes ?? [];
        string? replacedClassRef = replacedDataTypeId is null
            ? null
            : dataTypes.Find(dataType => dataType.Id == replacedDataTypeId)?.AppLogic?.ClassRef;
        string inSharedNamespace = InSharedNamespace(typeName);
        string inOwnNamespace = InOwnNamespace(typeName);
        bool anotherDataTypeHasClass = dataTypes.Any(dataType =>
            dataType.AppLogic?.ClassRef is { } classRef
            && classRef != replacedClassRef
            && (classRef == inSharedNamespace || classRef == inOwnNamespace)
        );
        if (anotherDataTypeHasClass)
        {
            throw new ModelWithTheSameBaseTypeAlreadyExists();
        }
    }

    private static string InSharedNamespace(string typeName) =>
        $"{CSharpGenerationSettings.DefaultModelNamespace}.{typeName}";

    private static string InOwnNamespace(string typeName) =>
        $"{CSharpGenerationSettings.DefaultModelNamespace}.{typeName}.{typeName}";
}
