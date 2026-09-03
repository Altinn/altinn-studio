using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class MetadataParser
{
    private const string FileRel = "App/config/applicationmetadata.json";

    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        var data = dir.ReadAllBytes(FileRel);
        if (data is null)
            return;

        if (!SourceParse.TryJson(app, FileRel, data, out var doc))
            return;
        using var _ = doc;
        var root = doc.RootElement;

        if (root.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
        {
            app.ApplicationId = idEl.GetString() ?? "";
        }

        if (root.TryGetProperty("title", out var titleEl) && titleEl.ValueKind == JsonValueKind.Object)
        {
            foreach (var p in titleEl.EnumerateObject())
            {
                app.TitleLanguages.Add(p.Name);
            }
        }

        if (root.TryGetProperty("dataTypes", out var dtsEl) && dtsEl.ValueKind == JsonValueKind.Array)
        {
            int i = 0;
            foreach (var dt in dtsEl.EnumerateArray())
            {
                var id = TryString(dt, "id") ?? "";
                var taskId = TryString(dt, "taskId") ?? "";
                var classRef = "";
                if (dt.TryGetProperty("appLogic", out var al) && al.ValueKind == JsonValueKind.Object)
                {
                    classRef = TryString(al, "classRef") ?? "";
                    if (
                        al.TryGetProperty("shadowFields", out var sf)
                        && sf.ValueKind == JsonValueKind.Object
                        && TryString(sf, "saveToDataType") is { Length: > 0 } saveTo
                    )
                        app.Refs.DataTypes.Add(
                            new DataTypeReference(
                                saveTo,
                                new SourceSpan(FileRel, $"/dataTypes/{i}/appLogic/shadowFields/saveToDataType")
                            )
                        );
                }
                var maxCount = TryInt(dt, "maxCount");
                var minCount = TryInt(dt, "minCount");
                app.DataTypes.Add(
                    new DataType(
                        id,
                        taskId,
                        classRef,
                        maxCount,
                        minCount,
                        new SourceSpan(FileRel, $"/dataTypes/{i}/id")
                    )
                );

                if (!string.IsNullOrEmpty(taskId))
                {
                    app.Refs.TaskIds.Add(
                        new TaskIdReference(taskId, new SourceSpan(FileRel, $"/dataTypes/{i}/taskId"))
                    );
                }
                if (!string.IsNullOrEmpty(classRef))
                {
                    app.Refs.CSharp.Add(
                        new CSharpClassReference(classRef, new SourceSpan(FileRel, $"/dataTypes/{i}/appLogic/classRef"))
                    );
                }
                i++;
            }
        }

        if (root.TryGetProperty("onEntry", out var onEntryEl) && onEntryEl.ValueKind == JsonValueKind.Object)
        {
            var show = TryString(onEntryEl, "show");
            if (!string.IsNullOrEmpty(show) && !IsReservedOnEntryShow(show))
            {
                var refr = new LayoutSetReference(show, new SourceSpan(FileRel, "/onEntry/show"));
                app.Refs.LayoutSets.Add(refr);
            }
        }

        CollectInstanceFields(app, root, "dataFields");
        CollectInstanceFields(app, root, "presentationFields");

        if (root.TryGetProperty("eFormidling", out var ef) && ef.ValueKind == JsonValueKind.Object)
        {
            if (TryString(ef, "sendAfterTaskId") is { Length: > 0 } sendAfter)
                app.Refs.TaskIds.Add(
                    new TaskIdReference(sendAfter, new SourceSpan(FileRel, "/eFormidling/sendAfterTaskId"))
                );
            CollectDataTypeArray(app, ef, "dataTypes", "/eFormidling/dataTypes");
        }

        if (root.TryGetProperty("copyInstanceSettings", out var cis) && cis.ValueKind == JsonValueKind.Object)
            CollectDataTypeArray(app, cis, "excludedDataTypes", "/copyInstanceSettings/excludedDataTypes");

        if (
            root.TryGetProperty("apiScopes", out var api)
            && api.ValueKind == JsonValueKind.Object
            && TryString(api, "errorMessageTextResourceKey") is { Length: > 0 } errKey
        )
            app.Refs.TextResources.Add(
                new TextResourceReference(
                    errKey,
                    "",
                    "apiScopes errorMessage",
                    new SourceSpan(FileRel, "/apiScopes/errorMessageTextResourceKey")
                )
            );
    }

    private static void CollectInstanceFields(AppModelBuilder app, JsonElement root, string prop)
    {
        if (!root.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var f in arr.EnumerateArray())
        {
            if (f.ValueKind == JsonValueKind.Object)
            {
                var dataTypeId = TryString(f, "dataTypeId");
                if (!string.IsNullOrEmpty(dataTypeId))
                    app.Refs.DataTypes.Add(
                        new DataTypeReference(dataTypeId, new SourceSpan(FileRel, $"/{prop}/{i}/dataTypeId"))
                    );
                if (TryString(f, "path") is { Length: > 0 } path)
                    app.Refs.DataModel.Add(
                        new DataModelReference(
                            path,
                            "",
                            prop,
                            new SourceSpan(FileRel, $"/{prop}/{i}/path"),
                            ExplicitDataType: string.IsNullOrEmpty(dataTypeId) ? null : dataTypeId
                        )
                    );
            }
            i++;
        }
    }

    private static void CollectDataTypeArray(AppModelBuilder app, JsonElement parent, string prop, string basePtr)
    {
        if (!parent.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var e in arr.EnumerateArray())
        {
            if (e.ValueKind == JsonValueKind.String && e.GetString() is { Length: > 0 } v)
                app.Refs.DataTypes.Add(new DataTypeReference(v, new SourceSpan(FileRel, $"{basePtr}/{i}")));
            i++;
        }
    }

    private static int? TryInt(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var v)
            ? v
            : null;

    private static bool IsReservedOnEntryShow(string v) => v is "select-instance" or "new-instance" or "startpage";
}
