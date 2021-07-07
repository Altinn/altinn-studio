namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes what an action applies to.
    /// An action may be constrained to one or more specific task/subresource of an app. If omitted, no such constraints exists and the action applies to the entire app. Alternatively, the special name "Default" indicates the same app-wide scope for the action, which can be used in conjunction with other constraints.
    /// For instance, an app may have "write" on both "Default" and "Task_1", which for the former may indicate access to delete an instance, or change app-wide metadata, while the latter represents access to fill/alter a form in a particular state.
    /// </summary>
    public class AppliesTo
    {
        /// <summary>
        /// Gets or sets the name of the process step / sub resource. Can be "Default" to indicate that the action applies to the entire app.
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the sequence number this step has. 0 if name is "Default".
        /// TODO! Does this make sense for 3.0? How do we deal with branching ("sporvalg") sequences?
        /// </summary>
        public int SequenceNumber { get; set; }

        /// <summary>
        /// Gets or sets the security level. Can be supplied if this process step has a specified security (authentication) level requirement overriding that of the app.
        /// </summary>
        public int SecurityLevel { get; set; }
    }
}
