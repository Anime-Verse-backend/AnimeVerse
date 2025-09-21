"use client";

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  options: any; 
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ options }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Make sure we have a video element and a player instance hasn't been created yet.
    if (videoRef.current && !playerRef.current) {
      const videoElement = document.createElement("video");
      videoElement.classList.add('video-js', 'vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, options, () => {
        console.log("Player is ready");
      });
    } else if(playerRef.current) {
      // If the player is already initialized, just update the source.
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options]);

  // Dispose the player when the component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
};
