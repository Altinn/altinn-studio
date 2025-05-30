/*
 * Gitea API.
 *
 * This documentation describes the Gitea API.
 *
 * OpenAPI spec version: 1.1.1
 *
 * Generated by: https://github.com/swagger-api/swagger-codegen.git
 */

using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    /// <summary>
    /// PayloadUser represents the author or committer of a commit
    /// </summary>
    [DataContract]
    public partial class PayloadUser
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="PayloadUser"/> class.
        /// </summary>
        public PayloadUser()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="PayloadUser" /> class.
        /// </summary>
        /// <param name="email">Email.</param>
        /// <param name="name">Full name of the commit author.</param>
        /// <param name="username">Username.</param>
        public PayloadUser(string email = default(string), string name = default(string), string username = default(string))
        {
            this.Email = email;
            this.Name = name;
            this.Username = username;
        }

        /// <summary>
        /// Gets or Sets Email
        /// </summary>
        [DataMember(Name = "email", EmitDefaultValue = false)]
        public string Email { get; set; }

        /// <summary>
        /// Full name of the commit author
        /// </summary>
        /// <value>Full name</value>
        [DataMember(Name = "name", EmitDefaultValue = false)]
        public string Name { get; set; }

        /// <summary>
        /// Gets or Sets Username
        /// </summary>
        [DataMember(Name = "username", EmitDefaultValue = false)]
        public string Username { get; set; }
    }
}
