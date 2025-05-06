#!/usr/bin/env python3
"""
Instagram Login Script for Instaloader
This script helps users log in to Instagram using Instaloader to create a session file.
The session file can then be used by other scripts to access Instagram content.
"""

import sys
import os
import getpass
import instaloader
import argparse

def login_to_instagram(username=None, password=None, session_name="default"):
    """
    Log in to Instagram using Instaloader and save the session.

    Args:
        username (str, optional): Instagram username. If not provided, will prompt.
        password (str, optional): Instagram password. If not provided, will prompt.
        session_name (str, optional): Name to save the session under. Defaults to "default".

    Returns:
        bool: True if login was successful, False otherwise.
    """
    try:
        # Create an instance of Instaloader
        loader = instaloader.Instaloader()

        # Get username if not provided
        if not username:
            username = input("Enter your Instagram username: ")

        # Get password if not provided
        if not password:
            password = getpass.getpass("Enter your Instagram password: ")

        print(f"Attempting to log in as {username}...")

        # Log in to Instagram
        loader.login(username, password)

        # Save the session file
        loader.save_session_to_file(session_name)

        # Get the session file path
        session_file = os.path.join(os.path.expanduser("~"), ".instaloader", f"session-{session_name}")

        print(f"Login successful! Session saved to: {session_file}")
        print("This session will be used automatically by the Instagram scripts.")

        return True

    except instaloader.exceptions.BadCredentialsException:
        print("Error: Invalid username or password.")
        return False

    except instaloader.exceptions.ConnectionException as e:
        print(f"Error connecting to Instagram: {str(e)}")
        print("This might be due to rate limiting or network issues.")
        return False

    except instaloader.exceptions.TwoFactorAuthRequiredException:
        print("Two-factor authentication is required.")
        try:
            # Get the two-factor code
            two_factor_code = input("Enter the two-factor code from your authenticator app: ")

            # Complete the two-factor authentication
            loader.two_factor_login(two_factor_code)

            # Save the session file
            loader.save_session_to_file(session_name)

            # Get the session file path
            session_file = os.path.join(os.path.expanduser("~"), ".instaloader", f"session-{session_name}")

            print(f"Login successful! Session saved to: {session_file}")
            print("This session will be used automatically by the Instagram scripts.")

            return True

        except Exception as e:
            print(f"Error during two-factor authentication: {str(e)}")
            return False

    except Exception as e:
        print(f"Unexpected error during login: {str(e)}")
        return False

def check_session(session_name="default"):
    """
    Check if a session file exists and is valid.

    Args:
        session_name (str, optional): Name of the session to check. Defaults to "default".

    Returns:
        bool: True if the session exists and is valid, False otherwise.
    """
    try:
        # Get the session file path
        session_file = os.path.join(os.path.expanduser("~"), ".instaloader", f"session-{session_name}")

        # Check if the session file exists
        if not os.path.exists(session_file):
            print(f"Session file not found: {session_file}")
            return False

        # Create an instance of Instaloader
        loader = instaloader.Instaloader()

        # Try to load the session
        loader.load_session_from_file(session_name)

        # Test the session by trying to get the profile of the logged-in user
        username = loader.test_login()

        if username:
            print(f"Session is valid. Logged in as: {username}")
            return True
        else:
            print("Session is invalid or expired.")
            return False

    except Exception as e:
        print(f"Error checking session: {str(e)}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Instagram Login Script for Instaloader")
    parser.add_argument("--username", help="Instagram username")
    parser.add_argument("--check", action="store_true", help="Check if the session is valid")
    parser.add_argument("--session", default="default", help="Session name (default: 'default')")

    args = parser.parse_args()

    if args.check:
        # Check if the session is valid
        success = check_session(args.session)
    else:
        # Log in to Instagram
        success = login_to_instagram(args.username, None, args.session)

    # Exit with appropriate code
    sys.exit(0 if success else 1)
