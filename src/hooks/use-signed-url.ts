import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; exp: number }>();

export function useSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 60 * 60) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    const key = `${bucket}/${path}`;
    const cached = cache.get(key);
    if (cached && cached.exp > Date.now()) {
      setUrl(cached.url);
      return;
    }
    let cancelled = false;
    supabase.storage.from(bucket).createSignedUrl(path, expiresIn).then(({ data }) => {
      if (cancelled) return;
      if (data?.signedUrl) {
        cache.set(key, { url: data.signedUrl, exp: Date.now() + (expiresIn - 60) * 1000 });
        setUrl(data.signedUrl);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, path, expiresIn]);

  return url;
}
