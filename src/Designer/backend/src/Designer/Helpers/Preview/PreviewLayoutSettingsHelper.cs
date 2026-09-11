using System.Linq;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Helpers.Preview;

/// <summary>
/// Helpers for adjusting layout settings for preview purposes.
/// </summary>
public static class PreviewLayoutSettingsHelper
{
    /// <summary>
    /// Adds the pdfLayoutName to pages.order in the layout settings for preview purposes.
    /// The actual Settings.json file is not modified.
    /// </summary>
    /// <param name="layoutSettings">The layout settings JsonNode to modify in-place.</param>
    public static void AddPdfLayoutNameToPageOrder(JsonNode layoutSettings)
    {
        JsonObject? pagesObject = layoutSettings?["pages"] as JsonObject;
        string? pdfLayoutName = pagesObject?["pdfLayoutName"]?.GetValue<string>();
        if (string.IsNullOrEmpty(pdfLayoutName))
        {
            return;
        }

        if (pagesObject?["groups"] is JsonArray groups)
        {
            JsonObject? lastGroupWithOrder = groups.OfType<JsonObject>().LastOrDefault(g => g["order"] is JsonArray);

            if (lastGroupWithOrder?["order"] is JsonArray groupOrder)
            {
                bool alreadyInOrder = groupOrder.Any(item => item?.GetValue<string>() == pdfLayoutName);
                if (!alreadyInOrder)
                {
                    groupOrder.Add(JsonValue.Create(pdfLayoutName));
                }
                return;
            }
        }

        if (pagesObject?["order"] is JsonArray order)
        {
            bool alreadyInOrder = order.Any(item => item?.GetValue<string>() == pdfLayoutName);
            if (!alreadyInOrder)
            {
                order.Add(JsonValue.Create(pdfLayoutName));
            }
        }
    }
}
