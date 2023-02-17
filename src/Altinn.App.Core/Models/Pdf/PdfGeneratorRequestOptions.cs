﻿namespace Altinn.App.Core.Models.Pdf;

/// <summary>
/// This class is created to match the PDF generator options used by the PDF generator.
/// </summary>
internal class PdfGeneratorRequestOptions
{
    /// <summary>
    /// Indicate whether header and footer should be included.
    /// </summary>
    public bool DisplayHeaderFooter { get; set; } = false;

    /// <summary>
    /// Indicate wheter the background should be included.
    /// </summary>
    public bool PrintBackground { get; set; } = true;

    /// <summary>
    /// Defines the page size. Default is A4.
    /// </summary>
    public string Format { get; set; } = "A4";

    /// <summary>
    /// Defines the page margins. Default is "0.4in" on all sides.
    /// </summary>
    public MarginOptions Margin { get; set; } = new();
}

/// <summary>
/// This class is created to match the PDF generator marking options.
/// </summary>
internal class MarginOptions
{
    /// <summary>
    /// Top margin, accepts values labeled with units.
    /// </summary>
    public string Top { get; set; } = "0.75in";

    /// <summary>
    /// Left margin, accepts values labeled with units
    /// </summary>
    public string Left { get; set; } = "0.75in";

    /// <summary>
    /// Bottom margin, accepts values labeled with units
    /// </summary>
    public string Bottom { get; set; } = "0.75in";

    /// <summary>
    /// Right margin, accepts values labeled with units
    /// </summary>
    public string Right { get; set; } = "0.75in";
}
