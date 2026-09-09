#nullable disable

using System;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Context to manage the organizations storage client
    /// </summary>
    public class OrgDataContext : IDisposable
    {
        private bool disposed = false;

        /// <summary>
        /// Disposes organization storage client
        /// </summary>
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        /// <summary>
        /// Disposes organization storage client
        /// </summary>
        /// <param name="disposing">Flag for disposing values</param>
        protected virtual void Dispose(bool disposing)
        {
            if (disposed)
            {
                return;
            }
            
            disposed = true;
        }
    }
}
