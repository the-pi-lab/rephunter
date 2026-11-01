"""Isolate test runs from real user data.

Tests exercise the settings endpoints, which persist to the shared
``data/settings.json`` configured the moment ``app.config`` is imported.
Setting ``REPOHUNTER_DATA_DIR`` here (before any test module import) redirects
all state to a throwaway directory so real configuration is never mutated.
"""

import os
import tempfile

_TEST_DATA_DIR = tempfile.mkdtemp(prefix="repohunter-test-data-")
os.environ["REPOHUNTER_DATA_DIR"] = _TEST_DATA_DIR
