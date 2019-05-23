using System;

//// For more information on enabling MVC for empty projects, visit http://go.microsoft.com/fwlink/?LinkID=397860
//// Inspired by this pattern https://github.com/aspnet/FileSystem/blob/32822deef3fd59b848842a500a3e989182687318/src/Microsoft.Extensions.FileProviders.Sources/EmptyDisposable.cs

namespace AltinnCore.Common.Backend
{
    /// <summary>
    /// Class created to be able to return a Disposable. Inspired by Microsoft
    /// </summary>
    internal class EmptyDisposable : IDisposable
    {
        /// <summary>
        /// Gets a instance of the new Empty
        /// </summary>
        public static EmptyDisposable Instance { get; } = new EmptyDisposable();

        /// <summary>
        /// Empty dispose method
        /// </summary>
        public void Dispose()
        {
            // Not implemented
        }
    }
}
