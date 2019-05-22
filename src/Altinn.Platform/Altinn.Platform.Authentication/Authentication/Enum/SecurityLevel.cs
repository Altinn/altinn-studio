using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Authentication.Enum
{
    /// <summary>
    /// This holds information about different types of authentication levels available in Altinn.
    /// </summary>
    public enum SecurityLevel
    {
        /// <summary>Security Level 0 (Self identified)</summary>
        SelfIdentifed = 0,

        /// <summary>Security Level 1 (static password)</summary>
        NotSensitive = 1,

        /// <summary>Security Level 2 (pin code)</summary>
        QuiteSensitive = 2,

        /// <summary>Security Level 3</summary>
        Sensitive = 3,

        /// <summary>Security Level 4 (buypass)</summary>
        VerySensitive = 4
    }
}
