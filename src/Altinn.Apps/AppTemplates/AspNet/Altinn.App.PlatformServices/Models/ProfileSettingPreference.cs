using Altinn.App.Services.ModelMetadata;

namespace Altinn.App.Services.Models
{
    /// <summary>
    /// Class describing a users profile setting preferences.
    /// </summary>
    public class ProfileSettingPreference
    {
        /// <summary>
        /// Gets or sets the Language type available to the user in Altinn.
        /// </summary>
        public Language Language { get; set; }

        /// <summary>
        /// Gets or sets the user's preselected party.
        /// </summary>
        public int PreSelectedPartyId { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the users want
        /// to be asked for the party on every form submission.
        /// </summary>
        public bool DoNotPromptForParty { get; set; }
    }
}
