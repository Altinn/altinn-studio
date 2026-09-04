"""Naming utilities for converting between formats."""

import re


class NamingConverter:
    """Converts names between different formats (XML, JSON, C#)."""
    
    @staticmethod
    def to_csharp_compatible(name: str) -> str:
        """Convert name to C# compatible identifier.
        
        Matches Altinn Studio's ConvertToCSharpCompatibleName logic.
        """
        if not name:
            return ""
        
        # Remove hyphens
        name = name.replace('-', '')
        
        # Ensure first character is valid (letter or underscore)
        if name and not name[0].isalpha() and name[0] != '_':
            name = '_' + name
        
        # Replace invalid characters with underscore
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        
        return name
    
    @staticmethod
    def to_pascal_case(name: str) -> str:
        """Convert name to PascalCase."""
        if not name:
            return ""
        
        # Handle kebab-case and snake_case
        parts = re.split(r'[-_\s]+', name)
        return ''.join(word.capitalize() for word in parts if word)
    
    @staticmethod
    def combine_id(parent_id: str, element_name: str) -> str:
        """Combine parent ID and element name into hierarchical ID."""
        safe_name = NamingConverter.to_csharp_compatible(element_name)
        if not parent_id:
            return safe_name
        return f"{parent_id}.{safe_name}"
    
    @staticmethod
    def combine_xpath(base_xpath: str, name: str) -> str:
        """Combine XPath segments."""
        if base_xpath == "/":
            return f"/{name}"
        return f"{base_xpath}/{name}"
