using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class ComponentBindingsCollector
{
    public static void CollectDataModelBindings(
        AppModelBuilder app,
        string ownerId,
        string ownerType,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        if (!c.TryGetProperty("dataModelBindings", out var b) || b.ValueKind != JsonValueKind.Object)
            return;
        foreach (var p in b.EnumerateObject())
        {
            var bindingPtr = $"{basePtr}/dataModelBindings/{p.Name}";
            switch (p.Value.ValueKind)
            {
                case JsonValueKind.String:
                {
                    var v = p.Value.GetString();
                    if (!string.IsNullOrEmpty(v))
                        app.Refs.DataModel.Add(
                            new DataModelReference(
                                v,
                                ownerId,
                                p.Name,
                                new SourceSpan(file, bindingPtr),
                                OwningComponentType: ownerType
                            )
                        );
                    break;
                }
                case JsonValueKind.Object:
                {
                    var field = TryString(p.Value, "field");
                    var dataType = TryString(p.Value, "dataType");
                    if (!string.IsNullOrEmpty(field))
                        app.Refs.DataModel.Add(
                            new DataModelReference(
                                field,
                                ownerId,
                                p.Name,
                                new SourceSpan(file, bindingPtr + "/field"),
                                ExplicitDataType: string.IsNullOrEmpty(dataType) ? null : dataType,
                                OwningComponentType: ownerType
                            )
                        );
                    if (!string.IsNullOrEmpty(dataType))
                        app.Refs.DataTypes.Add(
                            new DataTypeReference(dataType, new SourceSpan(file, bindingPtr + "/dataType"))
                        );
                    break;
                }
            }
        }
    }

    public static void CollectTextResourceBindings(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        if (!c.TryGetProperty("textResourceBindings", out var b) || b.ValueKind != JsonValueKind.Object)
            return;
        foreach (var p in b.EnumerateObject())
        {
            if (p.Value.ValueKind != JsonValueKind.String)
                continue;
            var v = p.Value.GetString();
            if (string.IsNullOrEmpty(v))
                continue;
            app.Refs.TextResources.Add(
                new TextResourceReference(
                    v,
                    ownerId,
                    p.Name,
                    new SourceSpan(file, $"{basePtr}/textResourceBindings/{p.Name}")
                )
            );
        }
    }
}
