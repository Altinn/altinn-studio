using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Models
{
    [DataContract]
    public class FileLinksResponse
    {
        public FileLinksResponse(string git = default(string), string html = default(string), string self = default(string))
        {
            this.git = git;
            this.html = html;
            this.self = self;
        }

        [DataMember(Name = "git", EmitDefaultValue = false)]
        public string git { get; set; }

        [DataMember(Name = "html", EmitDefaultValue = false)]
        public string html { get; set; }

        [DataMember(Name = "self", EmitDefaultValue = false)]
        public string self { get; set; }
    }
}
