namespace Altinn.App.Core.Models;

/// <summary>
/// Pages
/// </summary>
public class Pages
{
    /// <summary>
    /// Hide the close button in the upper left corner of the app.
    /// </summary>
    public bool? HideCloseButton { get; set; }

    /// <summary>
    /// Show the language selector in the upper right corner of the app.
    /// </summary>
    public bool? ShowLanguageSelector { get; set; }

    /// <summary>
    /// Show the expand width button in the upper right corner of the app.
    /// </summary>
    public bool? ShowExpandWidthButton { get; set; }

    /// <summary>
    /// Sets expanded width for pages.
    /// </summary>
    public bool? ExpandedWidth { get; set; }

    /// <summary>
    /// Enables a progress indicator in the upper right corner of the app (when on data tasks/forms).
    /// </summary>
    public bool? ShowProgress { get; set; }

    /// <summary>
    /// Specifies when the application saves form data.
    /// </summary>
    public AutoSaveBehavior? AutoSaveBehavior { get; set; }

    /// <summary>
    /// Shows the listed tasks in the sidebar navigation menu.
    /// </summary>
    public List<TaskNavigationEntry>? TaskNavigation { get; set; }

    /// <summary>
    /// Order
    /// </summary>
    public List<string>? Order { get; set; }

    /// <summary>
    /// Groups
    /// </summary>
    public List<PageGroup>? Groups { get; set; }

    /// <summary>
    /// Exclude from pdf
    /// </summary>
    public List<string>? ExcludeFromPdf { get; set; }

    /// <summary>
    /// Optional layout name for the generated PDF.
    /// </summary>
    public string? PdfLayoutName { get; set; }
}
