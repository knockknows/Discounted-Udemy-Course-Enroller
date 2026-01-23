
import sys
import platform

print(f"Python Version: {sys.version}")
print(f"Platform: {platform.platform()}")

try:
    print("Importing cloudscraper...")
    import cloudscraper
    print(f"Cloudscraper version: {cloudscraper.__version__ if hasattr(cloudscraper, '__version__') else 'unknown'}")
    print("Cloudscraper imported successfully.")
except Exception as e:
    print(f"FAILED to import cloudscraper: {e}")
    sys.exit(1)

try:
    print("Importing rookiepy...")
    import rookiepy
    print("rookiepy imported successfully.")
except Exception as e:
    print(f"FAILED to import rookiepy: {e}")
    sys.exit(1)

print("\nSUCCESS: Critical dependencies imported on Python 3.12")
