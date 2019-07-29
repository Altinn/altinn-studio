using System.Collections.Generic;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository
{
    public class QueryResponse
    {
        public int TotalHits { get; set; }

        public int Size { get; set; }

        public int Count { get; set; }

        public string ContinuationToken { get; set; }

        public List<Instance> Instances { get; set; }
    }
}
