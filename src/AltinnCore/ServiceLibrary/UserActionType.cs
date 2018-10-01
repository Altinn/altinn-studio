namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Enumeration for the different actions a user can make when filling out a service
    /// </summary>
    public enum UserActionType
    {
        /// <summary>
        /// The default action when noting else is choosen
        /// </summary>
        Default = 0,

        /// <summary>
        /// Navigate to next page
        /// </summary>
        NavigateNext = 1,

        /// <summary>
        /// Navigate to previous page
        /// </summary>
        NavigatePrevious = 2,

        /// <summary>
        /// Validate the service
        /// </summary>
        Validate = 3,

        /// <summary>
        /// Submit the service
        /// </summary>
        Submit = 4
    }
}
