namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// The properties of <c>Instance</c> and <c>DataElement</c> that a save of the instance data mutator sends, and the
/// Storage model types the instance is made of.
/// </summary>
/// <remarks>
/// Linked into Altinn.App.Analyzers, which reports a change to any other property of these types. A property added
/// here must also be sent by <c>InstanceDataUnitOfWork</c>.
/// </remarks>
internal static class InstanceSaveProperties
{
    public static readonly string[] Instance = ["DataValues", "PresentationTexts"];

    public static readonly string[] DataElement = ["Tags", "Metadata", "UserDefinedMetadata", "Refs", "Filename"];

    public const string TypeNamespace = "Altinn.Platform.Storage.Interface.Models";

    /// <summary>
    /// The types in <see cref="TypeNamespace"/> that the instance is made of, which apps treat as immutable except
    /// for the properties above. <c>KeyValueEntry</c> is left out, because it only holds saved metadata.
    /// </summary>
    public static readonly string[] Types =
    [
        "Instance",
        "DataElement",
        "InstanceOwner",
        "InstanceStatus",
        "Substatus",
        "CompleteConfirmation",
        "ProcessState",
        "ProcessElementInfo",
        "ValidationStatus",
        "ResourceLinks",
        "DeleteStatus",
        "Reference",
    ];
}
