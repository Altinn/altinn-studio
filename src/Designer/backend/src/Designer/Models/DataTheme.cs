using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class DataTheme
    {
        public string Uri { get; set; }

        public string Code { get; set; }

        public Dictionary<string, string> Label { get; set; }

        public string StartUse { get; set; }

        public ConceptSchema ConceptSchema { get; set; }
    }
}
