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

    [JsonPropertyName("autoSaveBehavior")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public AutoSaveBehaviorType? AutoSaveBehavior { get; set; }

    /// <summary>
    /// Deprecated British spelling of <see cref="AutoSaveBehavior"/>. Designer wrote this key until v9
    /// while the app runtime only ever read "autoSaveBehavior", so the setting had no effect. It is read
    /// so an existing Settings.json keeps its value, and never written back - the getter is always null,
    /// which <see cref="JsonIgnoreCondition.WhenWritingNull"/> omits.
    /// </summary>
    [JsonPropertyName("autoSaveBehaviour")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public AutoSaveBehaviorType? AutoSaveBehaviorLegacy
    {
        get => null;
        // Whichever key is read second wins for the current spelling, and ??= keeps it, so
        // "autoSaveBehavior" takes precedence regardless of the order the two appear in the file.
        set => AutoSaveBehavior ??= value;
    }

    [JsonPropertyName("taskNavigation")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<TaskNavigationGroup>? TaskNavigation { get; set; }

    [JsonPropertyName("excludeFromPdf")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? ExcludeFromPdf { get; set; }

    [JsonPropertyName("pdfLayoutName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PdfLayoutName { get; set; }

    [JsonPropertyName("validationOnNavigation")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ValidationOnNavigation? ValidationOnNavigation { get; set; }

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
            AutoSaveBehavior = AutoSaveBehavior,
            TaskNavigation = TaskNavigation,
            ExcludeFromPdf = ExcludeFromPdf,
            PdfLayoutName = PdfLayoutName,
            ValidationOnNavigation = ValidationOnNavigation,
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
            AutoSaveBehavior = AutoSaveBehavior,
            TaskNavigation = TaskNavigation,
            ExcludeFromPdf = ExcludeFromPdf,
            PdfLayoutName = PdfLayoutName,
            ValidationOnNavigation = ValidationOnNavigation,
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
