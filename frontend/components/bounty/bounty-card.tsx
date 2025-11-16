'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Users, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Bounty } from '@/types';

interface BountyCardProps {
  bounty: Bounty;
  onClick?: () => void;
}

export function BountyCard({ bounty, onClick }: BountyCardProps) {
  const progress = (bounty.videoCount / bounty.maxVideos) * 100;
  const daysLeft = Math.ceil(
    (new Date(bounty.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-surface border-border"
      onClick={onClick}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-2 text-foreground mb-1">
              {bounty.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {bounty.description}
            </p>
          </div>
          
          <Badge 
            variant={bounty.status === 'active' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {bounty.status}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-success" />
            <div>
              <p className="text-muted-foreground">Total Reward</p>
              <p className="font-semibold text-success">
                ${bounty.totalReward.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Videos</p>
              <p className="font-semibold">
                {bounty.videoCount}/{bounty.maxVideos}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-warning" />
            <div>
              <p className="text-muted-foreground">Deadline</p>
              <p className="font-semibold">
                {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Platform</p>
              <p className="font-semibold capitalize">{bounty.platform}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Slot Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          
          <Progress value={progress} className="h-2 progress-gradient" />
        </div>

        {/* Milestones */}
        {bounty.milestones && bounty.milestones.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Milestones:</p>
            <div className="flex flex-wrap gap-2">
              {bounty.milestones.slice(0, 3).map((milestone, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {milestone.viewsRequired.toLocaleString()} views → ${milestone.rewardAmount}
                </Badge>
              ))}
              {bounty.milestones.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{bounty.milestones.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}