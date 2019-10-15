using AltinnCore.Common.Models;
using AltinnCore.Designer.Repository.Models;

namespace AltinnCore.Designer.Services.Mapping
{
    /// <summary>
    /// Contains extension methods responsible for mapping one model to another
    /// </summary>
    public static class MappingExtensions
    {
        /// <summary>
        /// Converts ReleaseEntity to RepositoryCreateReleaseOption
        /// </summary>
        /// <param name="entity">ReleaseEntity</param>
        /// <returns>RepositoryCreateReleaseOption</returns>
        public static RepositoryCreateReleaseOption ToCreateReleaseOption(this ReleaseEntity entity)
            => new RepositoryCreateReleaseOption
            {
                TargetCommitish = entity.TargetCommitish,
                Name = entity.Name,
                Body = entity.Body,
                TagName = entity.TagName,
                Draft = false,
                PreRelease = false
            };
    }
}
