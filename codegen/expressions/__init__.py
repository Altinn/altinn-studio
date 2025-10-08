"""
Altinn Studio Layout Expressions - A module for generating and validating expressions for Altinn Studio layouts.
"""

__version__ = "0.1.0"

# Import the generator module
from .generator import generate_layout_expressions

__all__ = ["generate_layout_expressions"]
