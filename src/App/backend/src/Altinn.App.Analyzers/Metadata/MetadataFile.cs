using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Metadata;

/// <summary>
/// Reads <c>config/applicationmetadata.json</c> the way the app runtime deserializes it: with
/// <c>System.Text.Json</c> and <c>PropertyNameCaseInsensitive</c> (see <c>ApplicationMetadataParser</c> in
/// Altinn.App.Core), so property names are matched ignoring case and values as written.
/// </summary>
internal static class MetadataFile
{
    /// <summary>
    /// The app's metadata file. None or more than one is reported by the FormDataWrapperAnalyzer (ALTINNAPP0002),
    /// so callers stay quiet then.
    /// </summary>
    internal static AdditionalText? FindSingle(ImmutableArray<AdditionalText> additionalFiles) =>
        AdditionalFiles.Single(additionalFiles, FormDataWrapperUtils.IsApplicationMetadataFile);

    /// <summary>
    /// The file's content, or null when it cannot be read, is not valid JSON or has no <c>dataTypes</c> array. The
    /// app does not start then. The FormDataWrapperAnalyzer (ALTINNAPP0002) reports most of these cases, but not
    /// content after the root value, which nothing reports at build time.
    /// </summary>
    internal static MetadataContent? TryRead(AdditionalText file, CancellationToken token)
    {
        var content = file.GetText(token)?.ToString();
        if (content is null)
        {
            return null;
        }

        try
        {
            var metadata = JsonValue.Parse(content);
            if (metadata.Type != JsonType.Object)
            {
                return null;
            }

            // The reader is lazy and reports a syntax error only where it reads, so read the whole document first,
            // and like System.Text.Json accept nothing but whitespace after it.
            if (!string.IsNullOrWhiteSpace(content.Substring(metadata.End)))
            {
                return null;
            }

            var dataTypes = metadata.GetPropertyIgnoreCase("dataTypes");
            if (dataTypes?.Type != JsonType.Array)
            {
                return null;
            }

            var all = new List<MetadataDataType>();
            foreach (var dataType in dataTypes.GetArrayValues())
            {
                if (
                    dataType.Type == JsonType.Object
                    && dataType.GetPropertyIgnoreCase("id") is { Type: JsonType.String } id
                )
                {
                    all.Add(ReadDataType(id.GetString(), dataType));
                }
            }

            // Like HomeController.IsStatelessApp, every onEntry.show but the instance-backed ones names a folder.
            // AppMetadata defaults a missing show to "new-instance".
            var onEntry = metadata.GetPropertyIgnoreCase("onEntry");
            var show =
                onEntry?.Type == JsonType.Object
                && onEntry.GetPropertyIgnoreCase("show") is { Type: JsonType.String } value
                    ? value.GetString()
                    : null;
            var statelessFolder = show is null or "new-instance" or "select-instance" ? null : show;

            return new MetadataContent(new MetadataDataTypes(all), statelessFolder);
        }
        catch (NanoJsonException)
        {
            return null;
        }
    }

    private static MetadataDataType ReadDataType(string id, JsonValue dataType)
    {
        // InstanceDataUnitOfWork.AddBinaryDataElement rejects any classRef that is not null, an empty one included.
        var appLogic = dataType.GetPropertyIgnoreCase("appLogic");
        var hasClassRef =
            appLogic?.Type == JsonType.Object
            && appLogic.GetPropertyIgnoreCase("classRef") is { Type: JsonType.String };

        // Like AllowedContributorsHelper: the obsolete spelling wins when it lists anything.
        var allowedContributors = ReadStringList(dataType.GetPropertyIgnoreCase("allowedContributers"));
        if (allowedContributors is null || allowedContributors.Count == 0)
        {
            allowedContributors = ReadStringList(dataType.GetPropertyIgnoreCase("allowedContributors"));
        }

        var taskId = dataType.GetPropertyIgnoreCase("taskId") is { Type: JsonType.String } value ? value : null;
        return new MetadataDataType(
            id,
            hasClassRef,
            ReadStringList(dataType.GetPropertyIgnoreCase("allowedContentTypes")),
            allowedContributors,
            taskId?.GetString(),
            taskId?.Start ?? 0,
            taskId?.End ?? 0
        );
    }

    /// <summary>
    /// A JSON array as the runtime's <c>List&lt;string&gt;</c> holds it, with null for entries that are not strings.
    /// </summary>
    private static List<string?>? ReadStringList(JsonValue? value)
    {
        if (value?.Type != JsonType.Array)
        {
            return null;
        }

        var list = new List<string?>();
        foreach (var item in value.GetArrayValues())
        {
            list.Add(item.Type == JsonType.String ? item.GetString() : null);
        }

        return list;
    }
}

/// <summary>What the analyzers read from <c>applicationmetadata.json</c>.</summary>
/// <param name="DataTypes">The declared data types.</param>
/// <param name="StatelessFolder">
/// The layout folder a stateless app shows (<c>onEntry.show</c>), or null when the app starts users in an instance.
/// </param>
internal sealed record MetadataContent(MetadataDataTypes DataTypes, string? StatelessFolder);

/// <summary>The data types declared in <c>applicationmetadata.json</c>.</summary>
/// <param name="All">Every entry with a string id, in file order.</param>
internal sealed record MetadataDataTypes(List<MetadataDataType> All)
{
    /// <summary>
    /// The data type the runtime finds for an id: it matches exactly, and with List.Find the first entry wins.
    /// </summary>
    internal MetadataDataType? Find(string id) =>
        All.Find(dataType => string.Equals(dataType.Id, id, StringComparison.Ordinal));

    /// <summary>The first data type whose id matches ignoring case, for the readers that ignore case.</summary>
    internal MetadataDataType? FindIgnoringCase(string id) =>
        All.Find(dataType => string.Equals(dataType.Id, id, StringComparison.OrdinalIgnoreCase));
}

/// <param name="Id">The data type's id.</param>
/// <param name="HasClassRef">Whether <c>appLogic.classRef</c> is set, which makes it a form data model.</param>
/// <param name="AllowedContentTypes">
/// <c>allowedContentTypes</c>, or null when absent. Entries that are not strings are null.
/// </param>
/// <param name="AllowedContributors">
/// The contributor list the runtime uses: <c>allowedContributers</c> when it lists anything, otherwise
/// <c>allowedContributors</c>, or null when neither is an array.
/// </param>
/// <param name="TaskId">The <c>taskId</c>, or null when absent or not a string.</param>
/// <param name="TaskIdStart">Where the <c>taskId</c> value starts in the file.</param>
/// <param name="TaskIdEnd">Where the <c>taskId</c> value ends in the file.</param>
internal sealed record MetadataDataType(
    string Id,
    bool HasClassRef,
    List<string?>? AllowedContentTypes,
    List<string?>? AllowedContributors,
    string? TaskId,
    int TaskIdStart,
    int TaskIdEnd
);
