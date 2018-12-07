using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.RepositoryClient.Model
{
    /// <summary>
    /// Enums that defines if a Gitea User is an organization or user
    /// </summary>
    public enum UserType
    {
        /// <summary>
        /// Not defined
        /// </summary>
        Default = 0,

        /// <summary>
        /// It is a user
        /// </summary>
        User = 1,

        /// <summary>
        /// It is an organization
        /// </summary>
        Org = 2,
    }
}
