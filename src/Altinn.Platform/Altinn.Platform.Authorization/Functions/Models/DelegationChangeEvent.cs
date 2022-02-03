using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Functions.Models
{
    public class DelegationChangeEvent
    {
        public DelegationChangeEventType EventType { get; set; }
        public DelegationChange DelegationChange { get; set; }
    }
}
