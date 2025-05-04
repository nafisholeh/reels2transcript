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
        # Create an instance of Instaloader
        loader = instaloader.Instaloader()
        
        # Extract the shortcode from the URL
        shortcode = extract_shortcode_from_url(url)
        
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
