using System.Collections.Generic;
using System.Reflection.Emit;

namespace Altinn.Studio.Designer.Models
{
    public class ConceptSchema
    {
        public string Uri { get; set; }

        public Dictionary<string, string> Label { get; set; }

        public string VersionNumber { get; set; }
    }
}
