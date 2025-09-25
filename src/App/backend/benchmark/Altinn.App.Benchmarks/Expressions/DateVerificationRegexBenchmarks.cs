using System.Text.RegularExpressions;
using Altinn.App.Core.Internal.Expressions;

namespace Altinn.App.Benchmarks.Expressions;

[Config(typeof(Config))]
public class DateVerificationRegexBenchmarks
{
    private sealed class Config : ManualConfig
    {
        public Config()
        {
            this.SummaryStyle = SummaryStyle.Default.WithRatioStyle(RatioStyle.Trend);
            this.AddDiagnoser(MemoryDiagnoser.Default);
            // this.AddDiagnoser(new DotTraceDiagnoser());
            this.AddColumn(RankColumn.Arabic);
            this.Orderer = new DefaultOrderer(SummaryOrderPolicy.SlowestToFastest, MethodOrderPolicy.Declared);
        }
    }

    private Regex _dateVerificationRegex;

    [GlobalSetup]
    public void Setup()
    {
        _dateVerificationRegex = UnicodeDateTimeTokenConverter.DateVerificationRegex();
    }

    [Benchmark]
    public bool Verify() => _dateVerificationRegex.IsMatch("1963-06-19T08:30:06.28123+01:00Z");
}
