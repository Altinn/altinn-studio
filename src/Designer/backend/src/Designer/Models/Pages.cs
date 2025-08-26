#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Converters;

namespace Altinn.Studio.Designer.Models;

[JsonConverter(typeof(PagesJsonConverter))]
public class Pages
{
    [JsonPropertyName("hideCloseButton")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? HideCloseButton { get; set; }

    [JsonPropertyName("showLanguageSelector")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ShowLanguageSelector { get; set; }

    [JsonPropertyName("showExpandWidthButton")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ShowExpandWidthButton { get; set; }

    [JsonPropertyName("expandedWidth")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ExpandedWidth { get; set; }

    [JsonPropertyName("showProgress")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ShowProgress { get; set; }

    [JsonPropertyName("autoSaveBehaviour")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public AutoSaveBehaviourType? AutoSaveBehaviour { get; set; }

    [JsonPropertyName("taskNavigation")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<TaskNavigationGroup>? TaskNavigation { get; set; }

    [JsonPropertyName("excludeFromPdf")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? ExcludeFromPdf { get; set; }

    [JsonPropertyName("pdfLayoutName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PdfLayoutName { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }

    public PagesWithOrder ToPagesWithOrder()
    {
        return new PagesWithOrder
        {
            HideCloseButton = HideCloseButton,
            ShowLanguageSelector = ShowLanguageSelector,
            ShowExpandWidthButton = ShowExpandWidthButton,
            ExpandedWidth = ExpandedWidth,
            ShowProgress = ShowProgress,
            AutoSaveBehaviour = AutoSaveBehaviour,
            TaskNavigation = TaskNavigation,
            ExcludeFromPdf = ExcludeFromPdf,
            PdfLayoutName = PdfLayoutName,
            UnknownProperties = UnknownProperties,
        };
    }

    public PagesWithGroups ToPagesWithGroups()
    {
        return new PagesWithGroups
        {
            HideCloseButton = HideCloseButton,
            ShowLanguageSelector = ShowLanguageSelector,
            ShowExpandWidthButton = ShowExpandWidthButton,
            ExpandedWidth = ExpandedWidth,
            ShowProgress = ShowProgress,
            AutoSaveBehaviour = AutoSaveBehaviour,
            TaskNavigation = TaskNavigation,
            ExcludeFromPdf = ExcludeFromPdf,
            PdfLayoutName = PdfLayoutName,
            UnknownProperties = UnknownProperties,
        };
    }
}

public class PagesWithGroups : Pages
{
    [JsonPropertyName("groups")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<Group>? Groups { get; set; }
}

public class PagesWithOrder : Pages
{
    [JsonPropertyName("order")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Order { get; set; }
}
