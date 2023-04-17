using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Models
{
    [DataContract]
    public class ContentsResponse
    {
        [DataMember(Name = "_links", EmitDefaultValue = false)]
        public FileLinksResponse links {  get; set; }

        [DataMember(Name = "content", EmitDefaultValue = false)]
        public string content { get; set; }

        [DataMember(Name = "download_url", EmitDefaultValue = false)]
        public string download_url { get; set; }

        [DataMember(Name = "encoding", EmitDefaultValue = false)]
        public string encoding { get; set; }

        [DataMember(Name = "git_url", EmitDefaultValue = false)]
        public string git_url { get; set; }

        [DataMember(Name = "html_url", EmitDefaultValue = false)]
        public string html_url { get; set; }

        [DataMember(Name = "name", EmitDefaultValue = false)]
        public string name { get; set; }

        [DataMember(Name = "path", EmitDefaultValue = false)]
        public string path { get; set; }

        [DataMember(Name = "sha", EmitDefaultValue = false)]
        public string sha { get; set; }

        [DataMember(Name = "size", EmitDefaultValue = false)]
        public int size { get; set; }

        [DataMember(Name = "submodule_git_url", EmitDefaultValue = false)]
        public string submodule_git_url { get; set; }

        [DataMember(Name = "target", EmitDefaultValue = false)]
        public string target { get; set; }

        [DataMember(Name = "type", EmitDefaultValue = false)]
        public string type { get; set; }

        [DataMember(Name = "url", EmitDefaultValue = false)]
        public string url { get; set; }
    }
}
