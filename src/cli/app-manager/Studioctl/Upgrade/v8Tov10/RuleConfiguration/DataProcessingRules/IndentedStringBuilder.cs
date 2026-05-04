using System.Text;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.DataProcessingRules;

/// <summary>
/// A StringBuilder-like class that manages indentation levels automatically
/// </summary>
internal sealed class IndentedStringBuilder
{
    private readonly StringBuilder _builder = new();
    private int _indentLevel = 0;
    private readonly string _indentString;
    private bool _needsIndent = true;

    public IndentedStringBuilder(string indentString = "    ")
    {
        _indentString = indentString;
    }

    /// <summary>
    /// Increase indentation level
    /// </summary>
    public void Indent()
    {
        _indentLevel++;
    }

    /// <summary>
    /// Decrease indentation level
    /// </summary>
    public void Unindent()
    {
        if (_indentLevel > 0)
        {
            _indentLevel--;
        }
    }

    /// <summary>
    /// Append text with current indentation
    /// </summary>
    public void Append(string text)
    {
        if (_needsIndent && !string.IsNullOrEmpty(text))
        {
            AppendIndent();
            _needsIndent = false;
        }
        _builder.Append(text);
    }

    /// <summary>
    /// Append a line with current indentation
    /// </summary>
    public void AppendLine(string text = "")
    {
        if (!string.IsNullOrEmpty(text))
        {
            if (_needsIndent)
            {
                AppendIndent();
            }
            _builder.AppendLine(text);
        }
        else
        {
            _builder.AppendLine();
        }
        _needsIndent = true;
    }

    /// <summary>
    /// Append opening brace and increase indentation
    /// </summary>
    public void OpenBrace()
    {
        AppendLine("{");
        Indent();
    }

    /// <summary>
    /// Decrease indentation and append closing brace
    /// </summary>
    public void CloseBrace()
    {
        Unindent();
        AppendLine("}");
    }

    private void AppendIndent()
    {
        for (int i = 0; i < _indentLevel; i++)
        {
            _builder.Append(_indentString);
        }
    }

    public override string ToString()
    {
        return _builder.ToString();
    }
}
