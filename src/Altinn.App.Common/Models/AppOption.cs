namespace Altinn.App.Common.Models
{
    /// <summary>
    /// Represents a key value pair to be used as options in dropdown selectors.
    /// </summary>
    public class AppOption
    {
        /// <summary>
        /// The value of a given option
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// The label of a given option
        /// </summary>
        public string Label { get; set; }
    }
}
