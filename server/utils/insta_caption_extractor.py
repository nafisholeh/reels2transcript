#!/usr/bin/env python3
"""
Instagram Caption Extractor using Instaloader
This script extracts captions from Instagram posts using the Instaloader library.
"""

import sys
import json
import re
import instaloader
from urllib.parse import urlparse
import os
import time
import random

def extract_shortcode_from_url(url):
    """Extract the shortcode from an Instagram URL."""
    # Parse the URL
    parsed_url = urlparse(url)

    # Extract the path
    path = parsed_url.path

    # Remove trailing slash if present
    if path.endswith('/'):
        path = path[:-1]

    # Extract the shortcode (last part of the path)
    parts = path.split('/')
    shortcode = parts[-1]

    return shortcode

def get_post_caption(url):
    """
    Get the caption of an Instagram post using Instaloader.

    Args:
        url (str): The URL of the Instagram post.

    Returns:
        dict: A dictionary containing the caption and other metadata.
    """
    try:
        # Create an instance of Instaloader with specific options
        loader = instaloader.Instaloader(
            quiet=True,
            download_pictures=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            # Add user agent to avoid being blocked
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            # Add rate limiting to avoid being blocked
            max_connection_attempts=3
        )

        # Try to load session if available
        try:
            # Check if credentials file exists
            session_file = os.path.join(os.path.expanduser("~"), ".instaloader", "session-default")
            if os.path.exists(session_file):
                print(f"Loading session from {session_file}", file=sys.stderr)
                loader.load_session_from_file("default")
                print("Session loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"Could not load session: {str(e)}", file=sys.stderr)
            # Continue without session
            pass

        # Extract the shortcode from the URL
        shortcode = extract_shortcode_from_url(url)

        # Add random delay to avoid rate limiting
        delay = random.uniform(1, 3)
        time.sleep(delay)

        # Get the post
        post = instaloader.Post.from_shortcode(loader.context, shortcode)

        # Extract the caption and other metadata
        result = {
            "success": True,
            "caption": post.caption if post.caption else "No caption available",
            "username": post.owner_username,
            "likes": post.likes,
            "comments": post.comments,
            "date": post.date_local.isoformat(),
            "is_video": post.is_video,
            "shortcode": shortcode
        }

        return result

    except instaloader.exceptions.ConnectionException as e:
        return {
            "success": False,
            "error": f"Connection error: {str(e)}. Instagram may be rate-limiting requests.",
            "caption": "Failed to extract caption"
        }
    except instaloader.exceptions.LoginRequiredException as e:
        return {
            "success": False,
            "error": f"Login required: {str(e)}. This content may require authentication.",
            "caption": "Failed to extract caption"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "caption": "Failed to extract caption"
        }

if __name__ == "__main__":
    # Check if a URL was provided
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}))
        sys.exit(1)

    # Get the URL from command line arguments
    url = sys.argv[1]

    # Get the caption
    result = get_post_caption(url)

    # Print the result as JSON
    print(json.dumps(result))
