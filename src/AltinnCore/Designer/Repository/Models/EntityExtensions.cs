using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Designer.Repository.Models
{
    /// <summary>
    /// Contains extension methods for entity classes
    /// </summary>
    public static class EntityExtensions
    {
        /// <summary>
        /// Populates base properties
        /// </summary>
        /// <param name="entity">BaseEntity</param>
        /// <param name="org">org</param>
        /// <param name="app">app</param>
        /// <param name="httpContext">HttpContext</param>
        /// <returns></returns>
        public static BaseEntity PopulateBaseProperties(this BaseEntity entity, string org, string app, HttpContext httpContext)
        {
            List<Claim> claims = httpContext.User.Claims.ToList();
            entity.Org = org;
            entity.App = app;
            entity.Created = DateTime.Now;
            entity.CreatedBy = claims.FirstOrDefault(x => x.Type == AltinnCoreClaimTypes.Developer)?.Value;

            return entity;
        }
    }
}
