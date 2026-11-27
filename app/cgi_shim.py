"""cgi module shim for Python 3.13+ compatibility.

The cgi module was removed in Python 3.13. feedparser uses cgi.parse_header
to parse Content-Type headers. This shim provides a minimal implementation.
"""


def parse_header(line: str):
    """Parse a Content-Type-like header.

    Returns (mimetype, params_dict) where params_dict contains
    parameters like charset, boundary, etc.
    """
    parts = line.split(";")
    mimetype = parts[0].strip().lower()
    params = {}
    for part in parts[1:]:
        if "=" in part:
            key, value = part.split("=", 1)
            key = key.strip().lower()
            value = value.strip()
            # Remove surrounding quotes
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            params[key] = value
    return mimetype, params
