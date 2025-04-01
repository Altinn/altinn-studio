#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

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

    [JsonPropertyName("order")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Order { get; set; }

    [JsonPropertyName("groups")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<Group>? Groups { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}
