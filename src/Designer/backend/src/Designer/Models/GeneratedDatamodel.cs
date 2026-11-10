namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The text of each file of a generated app data model.
/// </summary>
public sealed record GeneratedDatamodel(
    string JsonSchema,
    string CsharpClasses,
    string Xsd,
    string ApplicationMetadata
);
