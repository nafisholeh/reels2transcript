#!/usr/bin/env python3

import sys
import os
import json
import wave
import argparse
from vosk import Model, KaldiRecognizer, SetLogLevel

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
    # Check if audio file exists
    if not os.path.exists(audio_path):
        print(f"Error: Audio file {audio_path} not found")
        return {"error": f"Audio file {audio_path} not found"}
    
    # Check if model exists
    if not os.path.exists(model_path):
        print(f"Error: Model {model_path} not found")
        return {"error": f"Model {model_path} not found"}
    
    try:
        # Set log level to suppress debug messages
        SetLogLevel(-1)
        
        # Load model
        model = Model(model_path)
        
        # Open audio file
        wf = wave.open(audio_path, "rb")
        
        # Check audio format
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
            print("Audio file must be WAV format mono PCM.")
            return {"error": "Audio file must be WAV format mono PCM"}
        
        # Create recognizer
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)
        
        # Process audio
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
        
        # Save to file if output path is provided
        if output_path:
            with open(output_path, "w") as f:
                json.dump(full_result, f, indent=2)
        
        return full_result
    
    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe audio using Vosk")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--model", default="../../models/vosk-model-en-us-small", help="Path to Vosk model")
    parser.add_argument("--output", help="Path to save transcription")
    
    args = parser.parse_args()
    
    result = transcribe_audio(args.audio_path, args.model, args.output)
    
    # Print result to stdout
    print(json.dumps(result))
