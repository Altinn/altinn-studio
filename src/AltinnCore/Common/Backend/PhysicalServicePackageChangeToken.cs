using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;

namespace AltinnCore.Common.Backend
{
    /// <summary>
    /// Watcher to verify if there as been created a package 
    /// </summary>
    public class PhysicalServicePackageChangeToken : IChangeToken
    {
        private string _package;
        private string _view;
        private DateTime _lastRequested;

        /// <summary>
        /// Initializes a new instance of the <see cref="PhysicalServicePackageChangeToken"/> class. 
        /// </summary>
        /// <param name="package">The full package path</param>
        /// <param name="view">The View name</param>
        public PhysicalServicePackageChangeToken(string package, string view)
        {
            _package = package;
            _view = view;
            _lastRequested = DateTime.Now;
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
                return IsThereANewPackage(_package.Substring(0, _package.LastIndexOf('/')), _lastRequested);
            }
        }

        /// <summary>
        /// Empty method to set a Callback. Created to support interface 
        /// </summary>
        /// <param name="callback">The callback</param>
        /// <param name="state">The state</param>
        /// <returns>Returns a empty IDisposable</returns>
        public IDisposable RegisterChangeCallback(Action<object> callback, object state) => EmptyDisposable.Instance;

        private bool IsThereANewPackage(string packageFolder, DateTime updated)
        {
            bool isUpdated = false;
            List<ServicePackageDetails> packageDetails = new List<ServicePackageDetails>();

            if (!Directory.Exists(packageFolder))
            {
                return false;
            }

            foreach (string fileName in Directory.EnumerateFiles(packageFolder))
            {
                ServicePackageDetails details = JsonConvert.DeserializeObject<ServicePackageDetails>(new StreamReader(ZipFile.OpenRead(fileName).Entries.First(e => e.Name == "ServicePackageDetails.json").Open()).ReadToEnd());
                
                if (details.CreatedDateTime > updated)
                {
                    isUpdated = true;
                }
            }

            return isUpdated;
        }
    }
}
