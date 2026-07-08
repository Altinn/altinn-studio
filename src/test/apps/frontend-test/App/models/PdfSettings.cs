using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Models
{
    /// <summary>
    /// A small data model that holds process-wide PDF settings for the frontend-test app. The
    /// setting applies to the whole process (every <c>pdfIfRequested</c> service task reads it),
    /// but the data element itself is bound to Task_1 in applicationmetadata.json - that is what
    /// makes autoCreate instantiate it and lets the Task_1 layout expose the toggle.
    /// </summary>
    [XmlRoot(ElementName = "PdfSettings")]
    public class PdfSettings
    {
        /// <summary>
        /// When true, the pdfIfRequested service tasks generate PDFs for the process. Defaults to
        /// unset (no PDFs) to keep test runs fast; the few tests that need PDFs opt in.
        /// </summary>
        [XmlElement("CreatePdf", Order = 1)]
        [JsonProperty("CreatePdf")]
        [JsonPropertyName("CreatePdf")]
        public bool? CreatePdf { get; set; }
    }
}
