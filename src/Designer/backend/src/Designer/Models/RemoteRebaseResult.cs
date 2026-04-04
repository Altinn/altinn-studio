#nullable disable
using System.Collections.Generic;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Models
{
    public class RemoteRebaseResult
    {
        public RebaseStatus Status { get; set; }

        public List<RepositoryContent> ContentStatus { get; set; } = [];
    }
}
