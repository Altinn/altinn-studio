using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Represents the Settings.json file containing configs for a layoutset
    /// </summary>
    public class LayoutSettings
    {
        [JsonPropertyName("$schema")]
        public string Schema { get; set; }
        public Pages Pages { get; set; }
        [CanBeNull] public Components Components { get; set; }
        [CanBeNull] public string ReceiptLayoutName { get; set; }
    }

    /// <summary>
    /// Represents config related to the pages in the layoutset - their order and which to exclude from pdf
    /// </summary>
    public class Pages
    {
        public string[] Order { get; set; }
        [CanBeNull] public string[] ExcludeFromPdf { get; set; }
    }

    /// <summary>
    /// Represents configs related to the components in the layoutset - which to exclude from pdf
    /// </summary>
    public class Components
    {
        [CanBeNull] public string[] ExcludeFromPdf { get; set; }
    }
}

