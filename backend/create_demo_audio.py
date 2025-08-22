#!/usr/bin/env python3
"""
Create a demo audio file for hackathon demonstration
"""

import os
import wave
import struct
import math
from pathlib import Path

def create_demo_audio():
    """Create a simple demo audio file"""
    
    # Audio parameters
    sample_rate = 16000  # 16kHz
    duration = 10  # 10 seconds
    frequency = 440  # A4 note
    
    # Create audio directory
    audio_dir = Path("data/audio")
    audio_dir.mkdir(exist_ok=True)
    
    # Generate sine wave audio data
    num_samples = int(sample_rate * duration)
    audio_data = []
    
    for i in range(num_samples):
        # Create a simple tone that fades in and out
        t = i / sample_rate
        fade = min(t, duration - t, 1.0)  # Fade in/out over 1 second
        amplitude = 0.3 * fade  # 30% volume with fade
        
        # Generate sine wave
        sample = amplitude * math.sin(2 * math.pi * frequency * t)
        
        # Convert to 16-bit integer
        sample_int = int(sample * 32767)
        audio_data.append(sample_int)
    
    # Save as WAV file
    output_file = audio_dir / "demo_podcast.wav"
    
    with wave.open(str(output_file), 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Write audio data
        for sample in audio_data:
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"✅ Demo audio created: {output_file}")
    print(f"📊 Duration: {duration} seconds")
    print(f"📊 Sample rate: {sample_rate} Hz")
    print(f"📊 File size: {output_file.stat().st_size} bytes")
    
    return output_file

if __name__ == "__main__":
    create_demo_audio()
