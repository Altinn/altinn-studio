namespace Altinn.App.Common.Enums
{
    /// <summary>
    /// Enumeration for all available application events
    /// </summary>
    public enum AppEventType : int
    {
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

        /// <summary>
        /// Events that triggers before process change
        /// </summary>
        BeforeProcessChange = 6,

        /// <summary>
        /// Events that triggers after process change
        /// </summary>
        AfterProcessChange = 7,

        /// <summary>
        /// Events that is triggered when a new app model is created. 
        /// </summary>
        AppModelCreation = 8
    }
}
