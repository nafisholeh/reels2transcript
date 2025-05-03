#!/usr/bin/env python3

import sys
import os
import json
import wave
import argparse
import time
import traceback
from vosk import Model, KaldiRecognizer, SetLogLevel

def check_dependencies():
    """
    Check if all required dependencies are installed

    Returns:
        tuple: (bool, str) - Success status and error message if any
    """
    try:
        import vosk
        return True, ""
    except ImportError:
        return False, "Vosk module not found. Please install it with 'pip install vosk'"

def check_audio_file(audio_path):
    """
    Check if audio file exists and is valid

    Args:
        audio_path (str): Path to audio file

    Returns:
        tuple: (bool, str) - Success status and error message if any
    """
    if not os.path.exists(audio_path):
        return False, f"Audio file {audio_path} not found"

    try:
        with wave.open(audio_path, "rb") as wf:
            # Check audio format
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
                return False, "Audio file must be WAV format mono PCM"
        return True, ""
    except Exception as e:
        return False, f"Invalid audio file: {str(e)}"

def check_model(model_path):
    """
    Check if model exists and is valid

    Args:
        model_path (str): Path to Vosk model

    Returns:
        tuple: (bool, str) - Success status and error message if any
    """
    if not os.path.exists(model_path):
        return False, f"Model {model_path} not found"

    required_files = ["am/final.mdl", "conf/mfcc.conf", "conf/model.conf"]
    for file in required_files:
        if not os.path.exists(os.path.join(model_path, file)):
            return False, f"Invalid model: {file} not found in model directory"

    return True, ""

def transcribe_audio(audio_path, model_path, output_path=None):
    """
    Transcribe audio file using Vosk

    Args:
        audio_path (str): Path to audio file
        model_path (str): Path to Vosk model
        output_path (str, optional): Path to save transcription. Defaults to None.

    Returns:
        dict: Transcription result
    """
    # Check dependencies
    deps_ok, deps_error = check_dependencies()
    if not deps_ok:
        return {"error": deps_error, "error_type": "DEPENDENCY_ERROR"}

    # Check audio file
    audio_ok, audio_error = check_audio_file(audio_path)
    if not audio_ok:
        return {"error": audio_error, "error_type": "AUDIO_FILE_ERROR"}

    # Check model
    model_ok, model_error = check_model(model_path)
    if not model_ok:
        return {"error": model_error, "error_type": "MODEL_ERROR"}

    try:
        # Set log level to suppress debug messages
        SetLogLevel(-1)

        print(f"Loading model from {model_path}...")
        start_time = time.time()

        # Load model
        model = Model(model_path)

        model_load_time = time.time() - start_time
        print(f"Model loaded in {model_load_time:.2f} seconds")

        # Open audio file
        wf = wave.open(audio_path, "rb")

        # Get audio info
        audio_duration = wf.getnframes() / wf.getframerate()
        audio_channels = wf.getnchannels()
        audio_sample_width = wf.getsampwidth()
        audio_framerate = wf.getframerate()

        print(f"Audio duration: {audio_duration:.2f} seconds")
        print(f"Audio channels: {audio_channels}")
        print(f"Audio sample width: {audio_sample_width}")
        print(f"Audio framerate: {audio_framerate} Hz")

        # Create recognizer
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)

        # Process audio
        print("Processing audio...")
        transcription_start_time = time.time()

        results = []
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                part_result = json.loads(rec.Result())
                results.append(part_result)

        # Get final result
        part_result = json.loads(rec.FinalResult())
        results.append(part_result)

        transcription_time = time.time() - transcription_start_time
        print(f"Audio processed in {transcription_time:.2f} seconds")

        # Combine results
        full_result = {
            "text": " ".join([r.get("text", "") for r in results if "text" in r]),
            "result": []
        }

        # Combine word segments
        for r in results:
            if "result" in r:
                full_result["result"].extend(r["result"])

        # Sort segments by start time
        if full_result["result"]:
            full_result["result"].sort(key=lambda x: x.get("start", 0))

        # Add metadata
        full_result["metadata"] = {
            "audio_duration": audio_duration,
            "model_load_time": model_load_time,
            "transcription_time": transcription_time,
            "real_time_factor": transcription_time / audio_duration if audio_duration > 0 else 0,
            "model": os.path.basename(model_path),
            "timestamp": time.time()
        }

        # Save to file if output path is provided
        if output_path:
            with open(output_path, "w") as f:
                json.dump(full_result, f, indent=2)
            print(f"Transcription saved to {output_path}")

        return full_result

    except Exception as e:
        error_message = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error transcribing audio: {error_message}")
        print(error_traceback)

        return {
            "error": error_message,
            "error_type": "TRANSCRIPTION_ERROR",
            "traceback": error_traceback
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe audio using Vosk")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--model", default="../../models/vosk-model-en-us-large", help="Path to Vosk model")
    parser.add_argument("--output", help="Path to save transcription")

    args = parser.parse_args()

    result = transcribe_audio(args.audio_path, args.model, args.output)

    # Print result to stdout
    print(json.dumps(result))
