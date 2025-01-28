using System;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Repository.Models
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
            entity.Org = org;
            entity.App = app;
            entity.Created = DateTime.UtcNow;
            entity.CreatedBy = AuthenticationHelper.GetDeveloperUserName(httpContext);

            return entity;
        }

        public static BaseEntity PopulateBaseProperties(this BaseEntity entity, AltinnRepoEditingContext editingContext, TimeProvider timeProvider)
        {
            entity.Org = editingContext.Org;
            entity.App = editingContext.Repo;
            entity.Created = timeProvider.GetUtcNow().DateTime;
            entity.CreatedBy = editingContext.Developer;

            return entity;
        }
    }
}
