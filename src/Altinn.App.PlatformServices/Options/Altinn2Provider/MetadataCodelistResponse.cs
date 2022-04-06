#nullable disable
using System.Collections.Generic;

namespace Altinn.App.PlatformServices.Options.Altinn2Provider
{
    /// <summary>
    /// Outer model for the https://www.altinn.no/api/metadata/codelists api
    /// </summary>
    public class MetadataCodelistResponse
    {
        /// <summary>
        /// Name of the code list
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Language code of the code list
        ///  1044 => "no",
        ///  1044 => "nb",
        ///  2068 => "nn",
        ///  1033 => "en",
        /// </summary>
        public int Language { get; set; }

        /// <summary>
        /// Version number from altinn 2 for the code list
        /// </summary>
        public int Version { get; set; }

        /// <summary>
        /// List of the code in the code list
        /// </summary>
        public List<MetadataCodeListCodes> Codes { get; set; }
    }

    /// <summary>
    /// Altinn 2 code list item
    /// </summary>
    public class MetadataCodeListCodes
    {
        /// <summary>
        /// Coode for the entry that is shared between languages
        /// </summary>
        public string Code { get; set; }

        /// <summary>
        /// Value 1 from the altinn2 metadata api
        /// </summary>
        public string Value1 { get; set; }

        /// <summary>
        /// Value 2 from the altinn2 metadata api
        /// </summary>
        public string Value2 { get; set; }

        /// <summary>
        /// Value 3 from the altinn2 metadata api
        /// </summary>
        public string Value3 { get; set; }
    }
}
