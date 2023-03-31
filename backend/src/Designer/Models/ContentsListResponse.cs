using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Models
{
    [DataContract]
    public class ContentsResponse
    {
        public ContentsResponse(FileLinksResponse links = default(FileLinksResponse), string content = default(string), string download_url = default(string), string encoding = default(string), string git_url = default(string), string html_url = default(string), string name = default(string),
            string path = default(string), string sha = default(string), int size = default(int), string submodule_git_url = default(string), string target = default(string), string type = default(string), string url = default(string))
        {
            this.links = links;
            this.content = content;
            this.download_url = download_url;
            this.encoding = encoding;
            this.git_url = git_url;
            this.html_url = html_url;
            this.name = name;
            this.path = path;
            this.sha = sha;
            this.size = size;
            this.submodule_git_url = submodule_git_url;
            this.target = target;
            this.type = type;
            this.url = url;

        }

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
