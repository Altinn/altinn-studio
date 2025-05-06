using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class LosTerm
    {
        public string InternalId { get; set; }
        public List<string> Children { get; set; }
        public List<string> Parents { get; set; }
        public bool IsTheme { get; set; }
        public List<string> LosPaths { get; set; }
        public Dictionary<string, string> Name { get; set; }
        public string Definition { get; set; }
        public string Uri { get; set; }
        public List<string> Synonyms { get; set; }
        public List<string> RelatedTerms { get; set; }
        public bool Theme { get; set; }
    }
}
