"""Simple JSON utility functions."""
import json


def is_json(text):
    """Check if a string is valid JSON"""
    if not isinstance(text, str):
        return False
    try:
        json.loads(text)
        return True
    except:
        return False
