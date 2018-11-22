namespace AltinnCore.ServiceLibrary.Enums
{
    /// <summary>
    /// Enumeration for all available service events
    /// </summary>
    public enum ServiceEventType : int
    {
        /// <summary>
        /// The before render event
        /// </summary>
        BeforeRender = 0,

        /// <summary>
        /// The calculation event
        /// </summary>
        Calculation = 1,

        /// <summary>
        /// The instantiation event
        /// </summary>
        Instantiation = 2,

        /// <summary>
        /// The validate instantiation event
        /// </summary>
        ValidateInstantiation = 3,

        /// <summary>
        /// The validation event
        /// </summary>
        Validation = 4,

        /// <summary>
        /// The data retrieval event
        /// </summary>
        DataRetrieval = 5,
    }
}
