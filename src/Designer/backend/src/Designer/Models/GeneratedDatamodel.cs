namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The text of each file that Designer saves for a data model in an app repository.
/// </summary>
public sealed record GeneratedDatamodel(
    string JsonSchema,
    string CsharpClasses,
    string Xsd,
    string ApplicationMetadata
);
