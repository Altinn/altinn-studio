using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Functions.Models
{
    public enum DelegationChangeEventType
    {
        Undefined = 0,
        Grant = 1,
        Revoke = 2,
        RevokeLast = 3
    }
}
