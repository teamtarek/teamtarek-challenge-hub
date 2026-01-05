import { useMemo } from "react";

interface VideoEmbedProps {
  url: string;
  className?: string;
}

const getVideoEmbedUrl = (url: string): { embedUrl: string; type: string } | null => {
  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  if (youtubeMatch) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      type: "youtube",
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      type: "vimeo",
    };
  }

  return null;
};

export const VideoEmbed = ({ url, className = "" }: VideoEmbedProps) => {
  const videoData = useMemo(() => getVideoEmbedUrl(url), [url]);

  if (!videoData) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {url}
      </a>
    );
  }

  return (
    <div className={`aspect-video rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={videoData.embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video"
      />
    </div>
  );
};

export const isValidVideoUrl = (url: string): boolean => {
  return getVideoEmbedUrl(url) !== null;
};
