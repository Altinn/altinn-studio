﻿using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface to describe the org service 
    /// </summary>
    public interface IOrgService
    {
        /// <summary>
        /// Returns a list of orga
        /// </summary>
        /// <returns></returns>
        public Task<OrgList> GetOrgList();
    }
}
