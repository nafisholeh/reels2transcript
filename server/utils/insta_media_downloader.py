#!/usr/bin/env python3
"""
Instagram Media Downloader using Instaloader
This script downloads media (video/audio) from Instagram posts using the Instaloader library.
"""

import sys
import json
import os
import re
import instaloader
from urllib.parse import urlparse
import tempfile
import shutil
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

def download_instagram_media(url, output_dir):
    """
    Download media from an Instagram post using Instaloader.

    Args:
        url (str): The URL of the Instagram post.
        output_dir (str): Directory to save the downloaded media.

    Returns:
        dict: A dictionary containing the download results and metadata.
    """
    try:
        # Create an instance of Instaloader with specific options
        # quiet=True suppresses terminal output
        # download_pictures=False to skip downloading images
        # download_video_thumbnails=False to skip thumbnails
        loader = instaloader.Instaloader(
            quiet=True,
            download_pictures=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=True,
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

        # Create a temporary directory for downloading
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download the post to the temporary directory
            loader.download_post(post, target=temp_dir)

            # Find the video file in the temp directory
            video_file = None
            for file in os.listdir(temp_dir):
                if file.endswith('.mp4'):
                    video_file = os.path.join(temp_dir, file)
                    break

            if not video_file:
                return {
                    "success": False,
                    "error": "No video file found in the downloaded content",
                    "media_path": None,
                    "caption": None
                }

            # Generate output filename based on shortcode
            output_filename = f"reel_{shortcode}.mp4"
            output_path = os.path.join(output_dir, output_filename)

            # Copy the video file to the output directory
            shutil.copy2(video_file, output_path)

            # Extract caption and other metadata
            caption = post.caption if post.caption else "No caption available"

            return {
                "success": True,
                "media_path": output_path,
                "caption": caption,
                "username": post.owner_username,
                "likes": post.likes,
                "comments": post.comments,
                "date": post.date_local.isoformat(),
                "is_video": post.is_video,
                "shortcode": shortcode
            }

    except instaloader.exceptions.ConnectionException as e:
        return {
            "success": False,
            "error": f"Connection error: {str(e)}. Instagram may be rate-limiting requests.",
            "media_path": None,
            "caption": None
        }
    except instaloader.exceptions.LoginRequiredException as e:
        return {
            "success": False,
            "error": f"Login required: {str(e)}. This content may require authentication.",
            "media_path": None,
            "caption": None
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "media_path": None,
            "caption": None
        }

if __name__ == "__main__":
    # Check if URL and output directory were provided
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python insta_media_downloader.py <instagram_url> <output_directory>"
        }))
        sys.exit(1)

    # Get the URL and output directory from command line arguments
    url = sys.argv[1]
    output_dir = sys.argv[2]

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Download the media
    result = download_instagram_media(url, output_dir)

    # Print the result as JSON
    print(json.dumps(result))
