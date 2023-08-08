using Altinn.App.Core.Features.FileAnalysis;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.FileAnalyzis
{
    /// <summary>
    /// Factory class that resolves the correct file analysers to run on against a <see cref="DataType"/>.
    /// </summary>
    public class FileAnalyserFactory : IFileAnalyserFactory
    {
        private readonly IEnumerable<IFileAnalyser> _fileAnalysers;

        /// <summary>
        /// Initializes a new instance of the <see cref="FileAnalyserFactory"/> class.
        /// </summary>
        public FileAnalyserFactory(IEnumerable<IFileAnalyser> fileAnalysers)
        {
            _fileAnalysers = fileAnalysers;
        }

        /// <summary>
        /// Finds the specified file analyser implementations based on the specified analyser id's.
        /// </summary>
        public IEnumerable<IFileAnalyser> GetFileAnalysers(IEnumerable<string> analyserIds)
        {
            return _fileAnalysers.Where(x => analyserIds.Contains(x.Id)).ToList();
        }
    }
}
