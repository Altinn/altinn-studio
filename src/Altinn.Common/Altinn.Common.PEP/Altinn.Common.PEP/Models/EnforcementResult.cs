using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.PEP.Models
{
    public class EnforcementResult
    {
        public bool Authorized { get; set; }

        public Dictionary<string, string> FailedObligations { get; set; }
    }
}
