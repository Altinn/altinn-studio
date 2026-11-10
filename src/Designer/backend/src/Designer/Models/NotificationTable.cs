using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Tabular notification content. The first cell of each row names the row; null or empty cells have no value.
/// </summary>
public sealed record NotificationTable(IReadOnlyList<string> Headers, IReadOnlyList<IReadOnlyList<string?>> Rows);
