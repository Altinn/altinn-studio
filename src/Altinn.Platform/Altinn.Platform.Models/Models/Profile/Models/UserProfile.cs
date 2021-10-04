using Altinn.Platform.Profile.Enums;
using Altinn.Platform.Register.Models;

namespace Altinn.Platform.Profile.Models
{
    /// <summary>
    /// Class describing a user profile
    /// </summary>
    public class UserProfile
    {
        /// <summary>
        /// Gets or sets the ID of the user
        /// </summary>
        public int UserId { get; set; }

        /// <summary>
        /// Gets or sets the username
        /// </summary>
        public string UserName { get; set; }

        /// <summary>
        /// Gets or sets ExternalIdentity
        /// </summary>
        public string ExternalIdentity { get; set; }

        /// <summary>
        /// Gets or sets the phone number
        /// </summary>
        public string PhoneNumber { get; set; }

        /// <summary>
        /// Gets or sets the email address
        /// </summary>
        public string Email { get; set; }

        /// <summary>
        /// Gets or sets the party ID
        /// </summary>
        public int PartyId { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="Party"/>
        /// </summary>
        public Party Party { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="UserType"/>
        /// </summary>
        public UserType UserType { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="ProfileSettingPreference"/>
        /// </summary>
        public ProfileSettingPreference ProfileSettingPreference { get; set; }
    }
}
