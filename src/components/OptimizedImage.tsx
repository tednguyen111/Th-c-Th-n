import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  aspectClass?: string;
}

export function OptimizedImage({
  src,
  alt,
  priority = false,
  aspectClass = 'aspect-[4/3]',
  className = '',
  ...rest
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`relative w-full ${aspectClass} bg-gradient-to-br from-[#F3EFEA] to-[#E6DFD5] dark:from-[#1F1F24] dark:to-[#18181C] flex flex-col items-center justify-center p-4 text-center overflow-hidden ${className}`}
      >
        <Utensils className="w-8 h-8 text-[#E04F16]/60 mb-2" />
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden bg-[#F2EFE9] dark:bg-[#1C1C21] ${className}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#EFECE6] via-[#E5E0D8] to-[#EFECE6] dark:from-[#1C1C21] dark:via-[#27272E] dark:to-[#1C1C21]"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...rest}
      />
    </div>
  );
}
