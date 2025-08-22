#!/usr/bin/env python3
"""
Create a working demo audio solution for hackathon
"""

import os
import wave
import struct
import math
from pathlib import Path

def create_working_demo():
    """Create working demo audio files in the correct locations"""
    
    # Create directories
    temp_audio_dir = Path("data/temp_audio")
    temp_audio_dir.mkdir(exist_ok=True)
    
    audio_dir = Path("data/audio")
    audio_dir.mkdir(exist_ok=True)
    
    # Audio parameters for web compatibility
    sample_rate = 22050  # Standard web audio rate
    duration = 5  # 5 seconds
    
    # Generate a pleasant tone sequence
    num_samples = int(sample_rate * duration)
    audio_data = []
    
    for i in range(num_samples):
        t = i / sample_rate
        
        # Create a pleasant chord progression
        freq1 = 440  # A4
        freq2 = 554.37  # C#5
        freq3 = 659.25  # E5
        
        # Fade in/out
        fade = min(t / 0.5, (duration - t) / 0.5, 1.0)
        amplitude = 0.2 * fade
        
        # Mix three frequencies for a pleasant sound
        sample = amplitude * (
            0.5 * math.sin(2 * math.pi * freq1 * t) +
            0.3 * math.sin(2 * math.pi * freq2 * t) +
            0.2 * math.sin(2 * math.pi * freq3 * t)
        )
        
        # Convert to 16-bit integer
        sample_int = int(sample * 32767)
        sample_int = max(-32768, min(32767, sample_int))  # Clamp
        audio_data.append(sample_int)
    
    # Create WAV files in both locations
    files_created = []
    
    for directory, filename in [
        (temp_audio_dir, "demo_podcast.wav"),
        (temp_audio_dir, "demo_podcast.mp3"),  # Actually WAV but named MP3
        (audio_dir, "demo_podcast.wav"),
        (audio_dir, "demo_podcast.mp3")  # Actually WAV but named MP3
    ]:
        output_file = directory / filename
        
        with wave.open(str(output_file), 'w') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            
            # Write audio data
            for sample in audio_data:
                wav_file.writeframes(struct.pack('<h', sample))
        
        files_created.append(output_file)
        print(f"✅ Created: {output_file} ({output_file.stat().st_size} bytes)")
    
    print(f"\n🎉 Created {len(files_created)} demo audio files")
    print(f"📊 Duration: {duration} seconds")
    print(f"📊 Sample rate: {sample_rate} Hz")
    print(f"📊 Format: 16-bit mono WAV")
    
    return files_created

if __name__ == "__main__":
    create_working_demo()
