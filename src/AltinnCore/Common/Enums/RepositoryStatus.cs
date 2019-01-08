using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Enums
{
    /// <summary>
    /// Enums with the different repo statuses
    /// </summary>
    [Flags]
    public enum RepositoryStatus
    {
        /// <summary>
        /// The file hasn't been modified.
        /// </summary>
        Ok = 0,

        /// <summary>
        /// Requires commit before checkout can happens
        /// </summary>
        CheckoutConflict = 1,

        /// <summary>
        ///  There exist a merge conflict in the repository
        /// </summary>
        MergeConflict = 2,
    }
}
