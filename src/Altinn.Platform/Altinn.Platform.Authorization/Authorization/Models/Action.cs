namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes an action that may be used in a rule describing a right.
    /// </summary>
    public class Action
    {
        /// <summary>
        /// Gets or sets the unique identifier for a specific rule within a policy. Not part of input model.
        /// </summary>
        public AppliesTo AppliesTo { get; set; }

        /// <summary>
        /// Gets or sets the name of the action, eg. read, write, sign.
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the title
        /// </summary>
        public string Title { get; set; }

        /// <summary>
        /// Gets or sets the description
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets the reason why the action cannot be delegated.
        /// </summary>
        public string CannotDelegateReason { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the action can be delegated by the user.
        /// </summary>
        public bool CanBeDelegatedByUser { get; set; }
    }
}
