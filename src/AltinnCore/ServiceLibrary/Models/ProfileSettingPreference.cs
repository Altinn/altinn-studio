using AltinnCore.ServiceLibrary.ServiceMetadata;
using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.ServiceLibrary.Models
{

    public class ProfileSettingPreference
    {
        /// <summary>
        /// Gets or sets the user ID that owns the preference
        /// </summary>
        [DataMember]
        public int UserId { get; set; }

        /// <summary>
        /// Gets or sets the Language type available to the user in Altinn
        /// </summary>
        [DataMember]
        public Language Language { get; set; }

        /// <summary>
        /// Gets or sets the user's preselected reportee
        /// </summary>
        [DataMember]
        public int PreSelectedReporteeId { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the users want 
        /// to be asked for the reportee on every form submission
        /// </summary>
        [DataMember]
        public bool DoNotPromptForReportee { get; set; }

    }
}
