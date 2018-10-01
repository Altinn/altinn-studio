using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Models
{
    public class RepositorySearch
    {
        public string KeyWord { get; set; }

        public bool OnlyAdmin { get; set; }

        public bool OnlyLocalRepositories { get; set; }

        public int PageSize { get; set; }

        public int Page { get; set; }
    }
}
