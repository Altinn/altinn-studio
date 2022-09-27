namespace Altinn.App.Core.Models
{
    /// <summary>
    /// Class representing the id of an instance.
    /// </summary>
    public class AppIdentifier
    {
        /// <summary>
        /// Organization that owns the app.
        /// </summary>
        public string Org { get; }

        /// <summary>
        /// Application name
        /// </summary>
        public string App { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="AppIdentifier"/> class.
        /// </summary>
        /// <param name="org">The app owner.</param>
        /// <param name="app">The app name.</param>
        public AppIdentifier(string org, string app)
        {
            Org = org;
            App = app;
        }
    }
}
