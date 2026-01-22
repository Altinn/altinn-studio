using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Global page settings for layout configuration.
/// </summary>
public class GlobalPageSettings
{
    /// <summary>
    /// Hide the close button in the upper left corner of the app.
    /// </summary>
    [JsonPropertyName("hideCloseButton")]
    public bool HideCloseButton { get; set; } = false;

    /// <summary>
    /// Show the language selector in the upper right corner of the app.
    /// </summary>
    [JsonPropertyName("showLanguageSelector")]
    public bool ShowLanguageSelector { get; set; } = false;

    /// <summary>
    /// Show the expand width button in the upper right corner of the app.
    /// </summary>
    [JsonPropertyName("showExpandWidthButton")]
    public bool ShowExpandWidthButton { get; set; } = false;

    /// <summary>
    /// Sets expanded width for pages.
    /// </summary>
    [JsonPropertyName("expandedWidth")]
    public bool ExpandedWidth { get; set; } = false;

    /// <summary>
    /// Enables a progress indicator in the upper right corner of the app (when on data tasks/forms).
    /// </summary>
    [JsonPropertyName("showProgress")]
    public bool ShowProgress { get; set; } = false;

    /// <summary>
    /// An attribute specifying when the application will save form data.
    /// onChangeFormData saves on every interaction with form elements.
    /// onChangePage saves on every page change.
    /// </summary>
    [JsonPropertyName("autoSaveBehavior")]
    public AutoSaveBehavior AutoSaveBehavior { get; set; } = AutoSaveBehavior.OnChangeFormData;

    /// <summary>
    /// Shows the listed tasks in the sidebar navigation menu.
    /// </summary>
    [JsonPropertyName("taskNavigation")]
    public List<TaskNavigationEntry> TaskNavigation { get; set; } = [];
}

/// <summary>
/// Auto save behavior options for form data.
/// </summary>
public enum AutoSaveBehavior
{
    /// <summary>
    /// Save on every interaction with form elements.
    /// </summary>
    OnChangeFormData,

    /// <summary>
    /// Save on every page change.
    /// </summary>
    OnChangePage,
}

/// <summary>
/// Base class for task navigation entries.
/// </summary>
[JsonConverter(typeof(TaskNavigationEntryJsonConverter))]
public abstract class TaskNavigationEntry
{
    /// <summary>
    /// Unique identifier for the navigation entry. Generated automatically if not provided.
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Optional name for the navigation entry.
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

/// <summary>
/// Navigation entry for a task.
/// </summary>
public class NavigationTask : TaskNavigationEntry
{
    /// <summary>
    /// The task ID to navigate to.
    /// </summary>
    [JsonPropertyName("taskId")]
    public required string TaskId { get; set; }
}

/// <summary>
/// Navigation entry for the receipt.
/// </summary>
public class NavigationReceipt : TaskNavigationEntry
{
    /// <summary>
    /// The type of the navigation entry.
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; } = "receipt";
}
