using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// The JSON format of text resources, as in <c>config/texts/resource.&lt;language&gt;.json</c>.
/// </summary>
internal static class TextResourceJson
{
    /// <summary>
    /// The text resource variable for a source: its data source, key and default value.
    /// </summary>
    public static TextResourceVariable ToVariable(TextVariableSource source)
    {
        var (dataSource, key) = source switch
        {
            TextVariableSource.CustomTextParameter parameter => ("customTextParameters", parameter.Name),
            TextVariableSource.Text text => ("text", text.TextKey),
            TextVariableSource.DataModel dataModel => ($"dataModel.{dataModel.DataType ?? "default"}", dataModel.Field),
            TextVariableSource.InstanceContext instanceContext => ("instanceContext", ToJson(instanceContext.Key)),
            TextVariableSource.ApplicationSetting setting => ("applicationSettings", setting.Key),
            TextVariableSource.Unsupported unsupported => (unsupported.DataSource, unsupported.Key),
            _ => throw new ArgumentOutOfRangeException(nameof(source), source, "Unknown text variable source"),
        };

        return new TextResourceVariable
        {
            DataSource = dataSource,
            Key = key,
            DefaultValue = source.DefaultValue,
        };
    }

    private static string ToJson(InstanceContextKey key) =>
        key switch
        {
            InstanceContextKey.InstanceOwnerPartyId => "instanceOwnerPartyId",
            InstanceContextKey.AppId => "appId",
            InstanceContextKey.InstanceId => "instanceId",
            InstanceContextKey.InstanceOwnerPartyType => "instanceOwnerPartyType",
            _ => throw new ArgumentOutOfRangeException(nameof(key), key, "Unknown instance context key"),
        };
}
