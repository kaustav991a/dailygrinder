"use client";

import React, { useState, useRef } from 'react';
import { Volume2, Coffee, CloudRain, Waves } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const sounds = [
  { name: 'Rain', url: 'https://cdn.pixabay.com/download/audio/2022/08/10/audio_2c24b67329.mp3', icon: CloudRain },
  { name: 'Cafe', url: 'https://cdn.pixabay.com/download/audio/2022/05/21/audio_a21908a86a.mp3', icon: Coffee },
  { name: 'Waves', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_75f45394de.mp3', icon: Waves },
];

export function AmbientSoundPlayer() {
  const [currentSound, setCurrentSound] = useState<{ name: string; url: string } | null>(null);
  const [volume, setVolume] = useState(50);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playSound = (sound: { name: string; url: string }) => {
    if (currentSound?.url === sound.url) {
      // If clicking the same sound, stop it
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentSound(null);
    } else {
      // Play new sound
      setCurrentSound(sound);
      if (audioRef.current) {
        audioRef.current.src = sound.url;
        audioRef.current.play().catch(error => console.error("Audio play failed", error));
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  return (
    <>
      <audio ref={audioRef} loop />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon">
            <Volume2 className="h-5 w-5" />
            <span className="sr-only">Ambient Sounds</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Ambient Sounds</h4>
            <div className="grid grid-cols-3 gap-2">
              {sounds.map((sound) => (
                <Button
                  key={sound.name}
                  variant={currentSound?.name === sound.name ? 'secondary' : 'outline'}
                  size="icon"
                  onClick={() => playSound(sound)}
                  className="h-12 w-full flex-col"
                >
                  <sound.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{sound.name}</span>
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volume: {volume}%</Label>
              <Slider
                id="volume"
                min={0}
                max={100}
                step={1}
                value={[volume]}
                onValueChange={handleVolumeChange}
                disabled={!currentSound}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
