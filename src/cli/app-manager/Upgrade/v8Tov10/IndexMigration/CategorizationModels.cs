namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Category of an element in Index.cshtml
/// </summary>
internal enum ElementCategory
{
    /// <summary>
    /// Standard framework element (expected to be in template)
    /// </summary>
    Expected,

    /// <summary>
    /// Known customization that can be migrated
    /// </summary>
    KnownCustomization,

    /// <summary>
    /// Unknown element that blocks migration
    /// </summary>
    Unexpected,
}

/// <summary>
/// Type of customization
/// </summary>
internal enum CustomizationType
{
    /// <summary>
    /// External stylesheet link
    /// </summary>
    ExternalStylesheet,

    /// <summary>
    /// External script reference
    /// </summary>
    ExternalScript,

    /// <summary>
    /// Inline style block
    /// </summary>
    InlineStylesheet,

    /// <summary>
    /// Inline script block
    /// </summary>
    InlineScript,
}

/// <summary>
/// Base record for a categorized element
/// </summary>
internal abstract record CategorizedElement
{
    /// <summary>
    /// Tag name of the element
    /// </summary>
    public required string TagName { get; init; }

    /// <summary>
    /// Outer HTML of the element
    /// </summary>
    public required string OuterHtml { get; init; }

    /// <summary>
    /// Category of the element
    /// </summary>
    public required ElementCategory Category { get; init; }
}

/// <summary>
/// An expected standard framework element
/// </summary>
internal sealed record ExpectedElement : CategorizedElement
{
    /// <summary>
    /// Description of what this element is
    /// </summary>
    public required string Description { get; init; }
}

/// <summary>
/// A known customization that can be migrated
/// </summary>
internal sealed record KnownCustomization : CategorizedElement
{
    /// <summary>
    /// Type of customization
    /// </summary>
    public required CustomizationType CustomizationType { get; init; }

    /// <summary>
    /// Content or URL to extract/migrate
    /// </summary>
    public required string ExtractionHint { get; init; }

    /// <summary>
    /// Description for reporting
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// For external scripts/stylesheets: The asset with all captured attributes.
    /// Null for inline content.
    /// </summary>
    public BrowserAsset? Asset { get; init; }
}

/// <summary>
/// An unexpected element that blocks migration
/// </summary>
internal sealed record UnexpectedElement : CategorizedElement
{
    /// <summary>
    /// Reason why this element is unexpected
    /// </summary>
    public required string Reason { get; init; }

    /// <summary>
    /// Location in document (e.g., "head", "body")
    /// </summary>
    public required string Location { get; init; }
}

/// <summary>
/// Result of categorizing all elements in Index.cshtml
/// </summary>
internal sealed record CategorizationResult
{
    /// <summary>
    /// Standard framework elements
    /// </summary>
    public List<ExpectedElement> ExpectedElements { get; init; } = [];

    /// <summary>
    /// Known customizations that can be migrated
    /// </summary>
    public List<KnownCustomization> KnownCustomizations { get; init; } = [];

    /// <summary>
    /// Unexpected elements that block migration
    /// </summary>
    public List<UnexpectedElement> UnexpectedElements { get; init; } = [];

    /// <summary>
    /// Whether migration can safely proceed
    /// </summary>
    public bool IsSafeToMigrate => UnexpectedElements.Count == 0;
}
