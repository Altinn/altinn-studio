from .detection import detect_app_major_version, detect_app_version_profile, get_app_version_profile
from .profile import AppVersionProfile
from .v8 import V8_PROFILE

__all__ = [
    "V8_PROFILE",
    "AppVersionProfile",
    "detect_app_major_version",
    "detect_app_version_profile",
    "get_app_version_profile",
]
