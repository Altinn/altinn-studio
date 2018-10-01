
namespace AltinnCore.ServiceLibrary.Enums
{
    /// <summary>
    /// Enumeration for the different step types
    /// </summary>
    public enum StepType
    {
        /// <summary>
        /// Enumeration value for the instantiation step type
        /// </summary>
        Instantiation = 0,

        /// <summary>
        /// Enumeration value for the lookup step type
        /// </summary>
        Lookup = 1,

        /// <summary>
        /// Enumeration value for the form filling step type
        /// </summary>
        FormFilling = 2,

        /// <summary>
        /// Enumeration value for the signing step type
        /// </summary>
        Signing = 3,

        /// <summary>
        /// Enumeration value for the payment step type
        /// </summary>
        Payment = 4,

        /// <summary>
        /// Enumeration value for the send in step type
        /// </summary>
        SendIn = 5,

        /// <summary>
        /// Enumeration value for the archive step type
        /// </summary>
        Archive = 6,
    }
}
