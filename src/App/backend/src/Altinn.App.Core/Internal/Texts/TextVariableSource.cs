namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// Where the value of a text variable comes from. This is data only: <see cref="TranslationService"/> finds the value,
/// and uses <see cref="DefaultValue"/> when there is none.
/// </summary>
internal abstract record TextVariableSource
{
    /// <summary>
    /// The value to use when the source has no value.
    /// </summary>
    public string? DefaultValue { get; init; }

    /// <summary>
    /// A value the caller passes in customTextParameters, under <paramref name="Name"/>.
    /// </summary>
    public sealed record CustomTextParameter(string Name) : TextVariableSource;

    /// <summary>
    /// The translation of another text, such as <c>appName</c>.
    /// </summary>
    public sealed record Text(string TextKey) : TextVariableSource;

    /// <summary>
    /// A field in the data model of <paramref name="DataType"/>, or of the layout set's data type when it is null.
    /// </summary>
    public sealed record DataModel(string? DataType, string Field) : TextVariableSource;

    /// <summary>
    /// A value about the instance.
    /// </summary>
    public sealed record InstanceContext(InstanceContextKey Key) : TextVariableSource;

    /// <summary>
    /// A frontend setting from the app's application settings.
    /// </summary>
    public sealed record ApplicationSetting(string Key) : TextVariableSource;

    /// <summary>
    /// A data source that is not supported. It never has a value.
    /// </summary>
    public sealed record Unsupported(string DataSource, string Key) : TextVariableSource;
}

/// <summary>
/// The values about an instance that a text can use.
/// </summary>
internal enum InstanceContextKey
{
    InstanceOwnerPartyId,
    AppId,
    InstanceId,
    InstanceOwnerPartyType,
}
