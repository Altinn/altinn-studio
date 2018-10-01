namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class describing a service navigation, used for determining which action was taken by the user
    /// </summary>
    public class ServiceNavigation
    {
        /// <summary>
        /// Gets or sets a value indicating that the navigate to next page event was the trigger
        /// </summary>
        public string NavigationButtonNext { get; set; }

        /// <summary>
        /// Gets or sets a value indicating that the navigate to previous page event was the trigger
        /// </summary>
        public string NavigationButtonPrevious { get; set; }

        /// <summary>
        /// Gets or sets a value indicating that the submit form event was the trigger
        /// </summary>
        public string NavigationButtonSubmit { get; set; }

        /// <summary>
        /// Gets or sets a value indicating that the validate form event was the trigger
        /// </summary>
        public string NavigationButtonValidate { get; set; }

        /// <summary>
        /// Gets or sets the name of the current view
        /// </summary>
        public string CurrentView { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the service should be validated
        /// </summary>
        public bool Validate { get; set; }

        /// <summary>
        /// Gets the user action based on the navigation properties
        /// </summary>
        /// <returns>The <see cref="UserActionType"/> that was performed</returns>
        public UserActionType UserAction()
        {
            if (!string.IsNullOrEmpty(NavigationButtonNext))
            {
                return UserActionType.NavigateNext;
            }
            else if (!string.IsNullOrEmpty(NavigationButtonPrevious))
            {
                return UserActionType.NavigatePrevious;
            }
            else if (!string.IsNullOrEmpty(NavigationButtonSubmit))
            {
                return UserActionType.Submit;
            }
            else if (!string.IsNullOrEmpty(NavigationButtonValidate))
            {
                return UserActionType.Validate;
            }

            return UserActionType.NavigateNext;
        }
    }
}
