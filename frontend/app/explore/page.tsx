'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BountyCard } from '@/components/bounty/bounty-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { api } from '@/lib/api/client';
import type { Bounty } from '@/types';

export default function ExplorePage() {
  const [filters, setFilters] = useState({
    platform: 'all',
    sortBy: 'deadline',
    search: '',
  });

  // Fetch bounties with TanStack Query
  const { data: bounties = [], isLoading } = useQuery<Bounty[]>({
    queryKey: ['bounties'],
    queryFn: async () => {
      const response = await api.bounties.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // Filter and sort bounties locally
  const filteredBounties = Array.isArray(bounties) ? bounties
    .filter((bounty) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          bounty.title.toLowerCase().includes(searchLower) ||
          bounty.description.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter((bounty) => {
      // Platform filter
      if (filters.platform !== 'all') {
        return bounty.platform === filters.platform;
      }
      return true;
    })
    .sort((a, b) => {
      // Sorting logic
      switch (filters.sortBy) {
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'reward':
          const totalA = a.milestones.reduce((sum, m) => sum + parseFloat(m.rewardAmount), 0);
          const totalB = b.milestones.reduce((sum, m) => sum + parseFloat(m.rewardAmount), 0);
          return totalB - totalA;
        case 'new':
          return b.id - a.id;
        case 'popular':
          return (b.videoCount || 0) - (a.videoCount || 0);
        default:
          return 0;
      }
    }) : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore Bounties</h1>
        <p className="text-white/60">
          Browse active video bounties and start earning rewards
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search bounties..."
            className="pl-10"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Platform & Sort */}
        <div className="flex gap-4">
          <Select
            value={filters.platform}
            onValueChange={(value) => setFilters({ ...filters, platform: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy}
            onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Ending Soon</SelectItem>
              <SelectItem value="reward">Highest Reward</SelectItem>
              <SelectItem value="new">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-white/60">
        {isLoading ? 'Loading...' : `${filteredBounties.length} bounties found`}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 bg-white/5 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredBounties.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/60 text-lg">No bounties found</p>
          <p className="text-white/40 text-sm mt-2">
            Try adjusting your filters or search
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  );
}