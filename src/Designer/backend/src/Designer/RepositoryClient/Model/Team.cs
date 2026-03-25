#nullable disable
namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    /// <summary>
    /// A team
    /// </summary>
    public class Team
    {
        /// <summary>
        /// The unique identifier of the team
        /// </summary>
        public long Id { get; set; }

        /// <summary>
        /// The name of the team
        /// </summary>
        public string Name { get; set; }

        public bool CanCreateOrgRepo { get; set; }

        /// <summary>
        /// The organization that owns the team
        /// </summary>
        public Organization Organization { get; set; }
    }
}
