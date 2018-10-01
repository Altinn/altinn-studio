using System;
using System.Collections.Generic;
using System.IO;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.Extensions.Primitives;


namespace AltinnCore.Common.Backend
{
    /// <summary>
    /// Watcher to verify if there as been created a package 
    /// </summary>
    public class ServDevViewFileChangeToken : IChangeToken
    {
        private string _repositoryFolder;
        private string _view;
        private DateTime _lastRequested;

        /// <summary>
        /// Initializes a new instance of the <see cref="ServDevViewFileChangeToken"/> class. 
        /// </summary>
        /// <param name="repositoryFolder">The location of the service repository</param>
        /// <param name="view">The View name</param>
        public ServDevViewFileChangeToken(string repositoryFolder, string view)
        {
            _view = view;
            _lastRequested = DateTime.Now;
            _repositoryFolder = repositoryFolder;
        }

        /// <summary>
        /// Gets a value indicating whether callback are active. Will always return false
        /// </summary>
        public bool ActiveChangeCallbacks
        {
            get
            {
               return false;
            }
        }

        /// <summary>
        /// Gets a value indicating whether file has changed 
        /// </summary>
        public bool HasChanged
        {
            get
            {
                bool hasChanged = false;

                if (IsThereAUpdatedServiceFile(_repositoryFolder + "Views", _lastRequested))
                {
                    hasChanged = true;
                }
                else if (IsThereAUpdatedServiceFile(_repositoryFolder + "Model", _lastRequested))
                {
                    hasChanged = true;
                }
                else if (IsThereAUpdatedServiceFile(_repositoryFolder + "Implementation", _lastRequested))
                {
                    hasChanged = true;
                }

                return hasChanged;
            }
        }

        /// <summary>
        /// Empty method to set a Callback. Created to support interface 
        /// </summary>
        /// <param name="callback">The callback</param>
        /// <param name="state">The state</param>
        /// <returns>Returns a empty IDisposable</returns>
        public IDisposable RegisterChangeCallback(Action<object> callback, object state) => EmptyDisposable.Instance;

        private bool IsThereAUpdatedServiceFile(string folder, DateTime updated)
        {
            bool isUpdated = false;
            List<ServicePackageDetails> packageDetails = new List<ServicePackageDetails>();

            if (!Directory.Exists(folder))
            {
                return false;
            }

            foreach (string fileName in Directory.EnumerateFiles(folder))
            {
                DateTime lastUpdated = File.GetLastWriteTime(fileName);

                if (lastUpdated > updated)
                {
                    isUpdated = true;
                }
            }

            return isUpdated;
        }
    }
}
