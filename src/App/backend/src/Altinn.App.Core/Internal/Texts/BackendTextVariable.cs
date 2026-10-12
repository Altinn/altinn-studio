namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A variable in the texts of a <see cref="BackendTextResource"/>. The texts refer to it by <see cref="Name"/>, like
/// <c>{maxSize}</c>, and <see cref="Source"/> says where its value comes from.
/// </summary>
/// <param name="Name">The placeholder name in the texts</param>
/// <param name="Description">What the value is, for documentation</param>
/// <param name="Source">Where the value comes from</param>
internal sealed record BackendTextVariable(string Name, string Description, TextVariableSource Source)
{
    /// <summary>
    /// A value the caller passes in customTextParameters, under <paramref name="name"/>. A missing value shows as
    /// nothing rather than as its name.
    /// </summary>
    public static BackendTextVariable CustomTextParameter(string name, string description) =>
        new(name, description, new TextVariableSource.CustomTextParameter(name) { DefaultValue = "" });

    /// <summary>
    /// The translation of the text <paramref name="textKey"/>, such as <c>appName</c>.
    /// </summary>
    public static BackendTextVariable Text(string name, string textKey, string description, string? fallback = null) =>
        new(name, description, new TextVariableSource.Text(textKey) { DefaultValue = fallback });

    /// <summary>
    /// A field in the data model of <paramref name="dataType"/>, or of the layout set's data type when it is null.
    /// </summary>
    public static BackendTextVariable DataModel(string name, string? dataType, string field, string description) =>
        new(name, description, new TextVariableSource.DataModel(dataType, field));

    /// <summary>
    /// A value about the instance.
    /// </summary>
    public static BackendTextVariable InstanceContext(string name, InstanceContextKey key, string description) =>
        new(name, description, new TextVariableSource.InstanceContext(key));

    /// <summary>
    /// A frontend setting from the app's application settings.
    /// </summary>
    public static BackendTextVariable ApplicationSetting(string name, string key, string description) =>
        new(name, description, new TextVariableSource.ApplicationSetting(key));
}
