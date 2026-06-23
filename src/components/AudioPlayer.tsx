import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { languageFlag, languageLabel } from "@/lib/languages";

type Track = { language: string; audio_path: string };

interface AudioPlayerProps {
  title: string;
  icon: React.ReactNode;
  accent: "terracotta" | "saffron";
  tracks: Track[];
  defaultLanguage: string;
}

export function AudioPlayer({ title, icon, accent, tracks, defaultLanguage }: AudioPlayerProps) {
  const initial =
    tracks.find((t) => t.language === defaultLanguage)?.language ??
    tracks.find((t) => t.language === "darija")?.language ??
    tracks[0]?.language;

  const [lang, setLang] = useState<string | undefined>(initial);
  const active = tracks.find((t) => t.language === lang);
  const url = useSignedUrl("recipe-audio", active?.audio_path);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  // Keep progress when switching language? Spec says "without losing progress" for pause/resume.
  // When changing language, start fresh.
  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, [lang]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    const onWait = () => setLoading(true);
    const onPlay = () => setLoading(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("waiting", onWait);
    a.addEventListener("playing", onPlay);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("waiting", onWait);
      a.removeEventListener("playing", onPlay);
    };
  }, [url]);

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      try {
        setLoading(true);
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    }
  }

  function seek(value: number[]) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = value[0];
    setTime(value[0]);
  }

  function restart() {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    setTime(0);
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
        No audio for {title.toLowerCase()} yet.
      </div>
    );
  }

  const accentClass =
    accent === "terracotta"
      ? "from-primary to-spice"
      : "from-accent to-saffron";

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <audio ref={audioRef} src={url ?? undefined} preload="metadata" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClass} text-primary-foreground shadow-warm`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">
              {fmt(time)} / {fmt(duration)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={restart}
            aria-label="Restart"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-warm"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            disabled={!url}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-[1px]" />
            )}
          </Button>
        </div>
      </div>

      <Slider
        className="mt-4"
        value={[time]}
        max={duration || 1}
        step={0.1}
        onValueChange={seek}
        aria-label="Audio progress"
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Language</span>
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="h-9 w-[170px] rounded-full border-border bg-secondary/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tracks.map((t) => (
              <SelectItem key={t.language} value={t.language}>
                <span className="mr-2">{languageFlag(t.language)}</span>
                {languageLabel(t.language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
