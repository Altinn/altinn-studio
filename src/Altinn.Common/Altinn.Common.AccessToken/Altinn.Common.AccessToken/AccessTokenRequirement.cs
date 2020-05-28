using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Common.AccessToken
{
    /// <summary>
    /// The requirement used to enable access token verification
    /// </summary>
    public class AccessTokenRequirement : IAuthorizationRequirement
    {
        /// <summary>
        /// Default constructor
        /// </summary>
        public AccessTokenRequirement()
        {
        }
    }
}
