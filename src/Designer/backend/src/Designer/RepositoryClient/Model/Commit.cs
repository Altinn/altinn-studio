using System.Collections.Generic;

namespace Altinn.Studio.Designer.RepositoryClient.Model;

public class GiteCommmit
{
    public object Author { get; set; }
    public object Commit { get; set; }
    public object Committer { get; set; }
    public string Created { get; set; }
    public List<object> Files { get; set; }
    public string HtmlUrl { get; set; }
    public List<object> Parents { get; set; }
    public string Sha { get; set; }
    public object Stats { get; set; }
    public string Url { get; set; }
}
