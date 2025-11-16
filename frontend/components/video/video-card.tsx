'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Eye } from 'lucide-react';
import type { Video } from '@/types';

interface VideoCardProps {
  video: Video;
  onClick?: () => void;
}

/**
 * VideoCard with lazy loading using IntersectionObserver
 * CRITICAL: Implements performance optimization from v0.2.6-ui/04_VERIFICATION_REPORT.md
 * - Only loads images when near viewport
 * - Prevents memory leaks
 * - Improves scroll performance
 */
export function VideoCard({ video, onClick }: VideoCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Load 50px before visible
        threshold: 0.1,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load image only when visible
  useEffect(() => {
    if (isVisible && !imageSrc) {
      setImageSrc(video.thumbnailUrl);
    }
  }, [isVisible, imageSrc, video.thumbnailUrl]);

  // Calculate progress to next milestone
  const nextMilestone = video.bounty.milestones.find(
    (m) => m.viewsRequired > video.currentViews
  );
  const progress = nextMilestone
    ? (video.currentViews / nextMilestone.viewsRequired) * 100
    : 100;

  return (
    <Card
      ref={cardRef}
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-surface border-border"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={video.title}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-surface">
            <Play className="w-12 h-12 text-muted-foreground animate-pulse" />
          </div>
        )}

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Views badge */}
        <Badge className="absolute top-2 right-2 bg-black/70 text-white border-none">
          <Eye className="w-3 h-3 mr-1" />
          {video.currentViews.toLocaleString()}
        </Badge>

        {/* Platform badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-2 left-2 bg-black/70 text-white border-none capitalize"
        >
          {video.platform}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold line-clamp-2 text-foreground">
          {video.title}
        </h3>

        {/* Creator */}
        <div className="flex items-center gap-2">
          {video.creator.avatarUrl ? (
            <img
              src={video.creator.avatarUrl}
              alt={video.creator.displayName}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-semibold">
                {video.creator.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm text-muted-foreground">
            {video.creator.displayName}
          </span>
        </div>

        {/* Progress to next milestone */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {nextMilestone && (
            <p className="text-xs text-muted-foreground">
              {nextMilestone.viewsRequired.toLocaleString()} views for ${nextMilestone.rewardAmount}
            </p>
          )}
        </div>

        {/* Bounty title */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Bounty: <span className="font-medium text-foreground">{video.bounty.title}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}