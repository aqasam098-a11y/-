import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatDuration } from '../utils/media';

interface VoicePlayerProps {
  src: string;
  initialDuration?: number;
  variant: 'buyer' | 'owner' | 'preview';
  isUrdu: boolean;
}

export function VoiceMessagePlayer({
  src,
  initialDuration = 0,
  variant,
  isUrdu,
}: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(initialDuration);
  }, [src, initialDuration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const isBuyer = variant === 'buyer';

  return (
    <div
      className={`flex items-center gap-3 min-w-[210px] sm:min-w-[240px] py-1 ${
        isBuyer ? 'text-[#102B19]' : 'text-[#F8F7EA]'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setDuration(d);
          }
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={
          isPlaying
            ? isUrdu
              ? 'وائس میسج روکیں'
              : 'Pause voice message'
            : isUrdu
              ? 'وائس میسج چلائیں'
              : 'Play voice message'
        }
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          isBuyer
            ? 'bg-[#102B19] text-[#FFF0A3] hover:bg-[#1A4227]'
            : 'bg-[#E5C65A] text-[#102B19] hover:bg-[#FFF0A3]'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          dir="ltr"
          className={`h-1.5 w-full rounded-full overflow-hidden ${
            isBuyer ? 'bg-[#102B19]/20' : 'bg-white/20'
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isBuyer ? 'bg-[#102B19]' : 'bg-[#FFF0A3]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1 tabular-nums opacity-85">
          <span>{isUrdu ? 'وائس میسج' : 'Voice note'}</span>
          <span dir="ltr">
            {isPlaying
              ? `${formatDuration(currentTime)} / ${formatDuration(duration)}`
              : formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
