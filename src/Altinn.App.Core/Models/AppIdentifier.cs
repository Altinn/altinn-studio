using Altinn.App.Core.Extensions;

namespace Altinn.App.Core.Models
{
    /// <summary>
    /// Class representing the id of an instance.
    /// </summary>
    public sealed class AppIdentifier : IEquatable<AppIdentifier>
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
            if (string.IsNullOrEmpty(org))
            {
                throw new ArgumentNullException(nameof(org));
            }

            if (string.IsNullOrEmpty(app))
            {
                throw new ArgumentNullException(nameof(app));
            }

            Org = org;
            App = app;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="AppIdentifier"/> class.
        /// </summary>
        /// <param name="id">Application id on the form org/app</param>
        public AppIdentifier(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            if (id.ContainsExactlyOne('/'))
            {
                (Org, App) = DeconstructAppId(id);
                return;
            }

            throw new ArgumentOutOfRangeException(nameof(id), "You must have exactly only one / (forward slash) in your id");
        }

        /// <summary>
        /// Deconstructs an app id into it's two logical parts - org and app.
        /// </summary>
        /// <param name="appId">App identifier on the form {org}/{app}</param>
        /// <returns>A 2-tuple with the org and the app</returns>
        private static (string org, string app) DeconstructAppId(string appId)
        {
            var deconstructed = appId.Split("/");
            string org = deconstructed[0];
            string app = deconstructed[1];

            return (org, app);
        }

        ///<inheritDoc/>
        public override bool Equals(object? obj)
        {
            return Equals(obj as AppIdentifier);
        }

        ///<inheritDoc/>
        public bool Equals(AppIdentifier? other)
        {
            return Org != null && App != null
               && Org.Equals(other?.Org, StringComparison.CurrentCultureIgnoreCase)
               && App.Equals(other?.App, StringComparison.CurrentCultureIgnoreCase);
        }

        ///<inheritDoc/>
        public override string ToString()
        {
            return $"{Org}/{App}";
        }

        ///<inheritDoc/>
        public override int GetHashCode()
        {
            return Org.GetHashCode() ^ App.GetHashCode();
        }
    }
}
