using System;
using System.Runtime.InteropServices;
using System.Text;

namespace Altinn.Studio.Common.App.V8;

/// <summary>
/// Reads which app frontend version a v8 app loads from <see cref="IndexPath"/>.
/// </summary>
/// <remarks>
/// A <c>meta</c> tag with <c>data-altinn-app-frontend-version</c> wins. Otherwise the version is the path segment of
/// the <c>altinn-app-frontend.js</c> script from altinncdn.no. Either must be an <see cref="AppFrontendVersion"/>,
/// or the page names none. Old pages hold malformed markup and Razor, so it scans tags leniently, skipping comments
/// and the content of scripts and styles.
/// </remarks>
public static class AppFrontendVersionReader
{
    /// <summary>The page that loads the app frontend, relative to the app's root.</summary>
    public const string IndexPath = "App/views/Home/Index.cshtml";

    private const string MetaAttribute = "data-altinn-app-frontend-version";
    private const string ScriptPrefix = "https://altinncdn.no/toolkits/altinn-app-frontend/";
    private const string ScriptFile = "altinn-app-frontend.js";
    private const string ScriptSuffix = "/" + ScriptFile;

    /// <summary>Reads the version from the page's UTF-8 bytes, or returns <c>null</c> when it names none.</summary>
    public static AppFrontendVersion? Read(ReadOnlyMemory<byte> content)
    {
        string text =
            MemoryMarshal.TryGetArray(content, out ArraySegment<byte> segment) && segment.Array is not null
                ? Encoding.UTF8.GetString(segment.Array, segment.Offset, segment.Count)
                : Encoding.UTF8.GetString(content.ToArray());
        return Read(text);
    }

    /// <summary>Reads the version from the page, or returns <c>null</c> when it names none.</summary>
    public static AppFrontendVersion? Read(string content)
    {
        string? metaVersion = null;
        string? scriptSource = null;
        var tags = new TagScanner(content);
        while (metaVersion is null && tags.Next())
        {
            if (tags.NameIs("meta"))
            {
                string? value = tags.Attribute(MetaAttribute);
                if (value is not null && value.Trim().Length > 0)
                {
                    metaVersion = value.Trim();
                }
            }
            else if (tags.NameIs("script") && scriptSource is null)
            {
                string? source = tags.Attribute("src");
                if (
                    source is not null
                    && source.AsSpan().IndexOf(ScriptPrefix.AsSpan(), StringComparison.Ordinal) >= 0
                    && source.AsSpan().IndexOf(ScriptFile.AsSpan(), StringComparison.Ordinal) >= 0
                )
                {
                    scriptSource = source;
                }
            }
        }

        return AppFrontendVersion.TryParse(metaVersion ?? SegmentOfScriptSource(scriptSource), out var version)
            ? version
            : null;
    }

    private static string? SegmentOfScriptSource(string? source)
    {
        if (source is null)
        {
            return null;
        }

        int prefix = source.IndexOf(ScriptPrefix, StringComparison.Ordinal);
        int suffix = source.IndexOf(ScriptSuffix, StringComparison.Ordinal);
        if (prefix < 0 || suffix < 0 || prefix >= suffix)
        {
            return null;
        }

        return source.Substring(prefix + ScriptPrefix.Length, suffix - prefix - ScriptPrefix.Length);
    }

    // Finds start tags in HTML, one at a time, and reads their attributes on request.
    private struct TagScanner
    {
        private readonly string _html;
        private int _position;
        private int _nameStart;
        private int _nameEnd;
        private int _tagEnd;

        public TagScanner(string html)
        {
            _html = html;
        }

        public readonly bool NameIs(string name) => TextEquals(_nameStart, _nameEnd, name);

        public bool Next()
        {
            while (true)
            {
                if (_tagEnd > _position)
                {
                    _position = _tagEnd;
                    SkipRawText();
                }

                int open = _html.IndexOf('<', _position);
                if (open < 0 || open + 1 >= _html.Length)
                {
                    _position = _html.Length;
                    return false;
                }

                if (string.CompareOrdinal(_html, open, "<!--", 0, 4) == 0)
                {
                    int close = _html.IndexOf("-->", open + 4, StringComparison.Ordinal);
                    _position = close < 0 ? _html.Length : close + 3;
                    continue;
                }

                _position = open + 1;
                if (!AsciiText.IsLetter(_html[_position]))
                {
                    continue;
                }

                _nameStart = _position;
                while (
                    _position < _html.Length && (AsciiText.IsLetterOrDigit(_html[_position]) || _html[_position] == '-')
                )
                {
                    _position++;
                }

                _nameEnd = _position;
                _tagEnd = FindTagEnd(_position);
                return true;
            }
        }

        // Returns the value of an attribute of the current tag, or null when the tag does not have it.
        public readonly string? Attribute(string name)
        {
            int position = _nameEnd;
            while (position < _tagEnd)
            {
                char c = _html[position];
                if (char.IsWhiteSpace(c) || c == '/')
                {
                    position++;
                    continue;
                }

                if (c == '>')
                {
                    return null;
                }

                int nameStart = position;
                while (
                    position < _tagEnd
                    && !char.IsWhiteSpace(_html[position])
                    && _html[position] is not ('=' or '>' or '/')
                )
                {
                    position++;
                }

                bool matches = TextEquals(nameStart, position, name);
                while (position < _tagEnd && char.IsWhiteSpace(_html[position]))
                {
                    position++;
                }

                string? value = string.Empty;
                if (position < _tagEnd && _html[position] == '=')
                {
                    position++;
                    while (position < _tagEnd && char.IsWhiteSpace(_html[position]))
                    {
                        position++;
                    }

                    (value, position) = ReadValue(position);
                }

                if (matches)
                {
                    return value;
                }
            }

            return null;
        }

        private readonly (string Value, int End) ReadValue(int position)
        {
            if (position < _tagEnd && _html[position] is '"' or '\'')
            {
                char quote = _html[position];
                int close = _html.IndexOf(quote, position + 1);
                int end = close < 0 || close > _tagEnd ? _tagEnd : close;
                return (_html.Substring(position + 1, end - position - 1), Math.Min(end + 1, _tagEnd));
            }

            int start = position;
            while (position < _tagEnd && !char.IsWhiteSpace(_html[position]) && _html[position] != '>')
            {
                position++;
            }

            return (_html.Substring(start, position - start), position);
        }

        // The index just after the '>' that ends the tag, skipping '>' inside quoted attribute values.
        private readonly int FindTagEnd(int position)
        {
            char quote = '\0';
            char previous = '\0';
            for (; position < _html.Length; position++)
            {
                char c = _html[position];
                if (quote != '\0')
                {
                    if (c == quote)
                    {
                        quote = '\0';
                    }

                    continue;
                }

                if (c is '"' or '\'' && previous == '=')
                {
                    quote = c;
                }
                else if (c == '>')
                {
                    return position + 1;
                }

                if (!char.IsWhiteSpace(c))
                {
                    previous = c;
                }
            }

            return _html.Length;
        }

        private readonly bool TextEquals(int start, int end, string name) =>
            end - start == name.Length
            && string.Compare(_html, start, name, 0, name.Length, StringComparison.OrdinalIgnoreCase) == 0;

        // Moves past the content of a script or style element, which is text rather than markup.
        private void SkipRawText()
        {
            bool isScript = NameIs("script");
            if ((!isScript && !NameIs("style")) || _html[_tagEnd - 1] != '>' || _html[_tagEnd - 2] == '/')
            {
                return;
            }

            string closing = isScript ? "</script" : "</style";
            int close = _html.IndexOf(closing, _position, StringComparison.OrdinalIgnoreCase);
            _position = close < 0 ? _html.Length : close;
        }
    }
}
