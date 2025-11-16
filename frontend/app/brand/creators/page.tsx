'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Star, Eye, DollarSign, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import type { Creator } from '@/types';

export default function CreatorDirectoryPage() {
  const { isConnected } = useWalletStore();
  const { connect } = useAuth();
  
  const [filters, setFilters] = useState({
    category: 'all',
    minRating: 'all',
    sortBy: 'rating',
    search: '',
  });

  // Fetch all creators
  const { data: creators = [], isLoading } = useQuery<Creator[]>({
    queryKey: ['creators'],
    queryFn: async () => {
      try {
        const response = await api.creator.getAll();
        
        // Backend returns {data: [...]}, Axios wraps it in response.data
        // So we need response.data.data to get the array
        const creatorsData = Array.isArray(response.data.data) ? response.data.data : [];
        
        
        // Fetch stats for each creator
        const creatorsWithStats = await Promise.all(
          creatorsData.map(async (creator: any) => {
            try {
              const statsResponse = await api.creator.getStats(creator.wallet);
              return {
                ...creator,
                address: creator.wallet,
                stats: statsResponse.data.data || statsResponse.data
              };
            } catch (error) {
              // Return creator with empty stats if stats fetch fails
              return {
                ...creator,
                address: creator.wallet,
                stats: {
                  totalEarned: 0,
                  totalViews: 0,
                  videoCount: 0,
                  successRate: 0,
                  avgAiRating: 0
                }
              };
            }
          })
        );
        
        return creatorsWithStats;
      } catch (error) {
        console.error('Failed to fetch creators:', error);
        return [];
      }
    },
  });

  // Filter and sort creators
  const filteredCreators = Array.isArray(creators) ? creators
    .filter((creator) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return creator.displayName.toLowerCase().includes(searchLower);
      }
      return true;
    })
    .filter((creator) => {
      // Category filter
      if (filters.category !== 'all' && creator.category) {
        return creator.category.toLowerCase() === filters.category;
      }
      return true;
    })
    .filter((creator) => {
      // Min rating filter
      if (filters.minRating !== 'all') {
        return (creator.stats?.avgAiRating || 0) >= Number(filters.minRating);
      }
      return true;
    })
    .sort((a, b) => {
      // Sorting
      switch (filters.sortBy) {
        case 'rating':
          return (b.stats?.avgAiRating || 0) - (a.stats?.avgAiRating || 0);
        case 'earnings':
          return (b.stats?.totalEarned || 0) - (a.stats?.totalEarned || 0);
        case 'views':
          return (b.stats?.totalViews || 0) - (a.stats?.totalViews || 0);
        case 'success':
          return (b.stats?.successRate || 0) - (a.stats?.successRate || 0);
        default:
          return 0;
      }
    }) : [];

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Creator Directory</h1>
          <p className="text-white/60 mb-8">
            Connect your wallet to browse creators and make offers
          </p>
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Creators</h1>
        <p className="text-white/60">
          Browse talented creators and make direct offers
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search by name..."
            className="pl-10"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Category, Rating & Sort */}
        <div className="flex flex-wrap gap-4">
          <Select
            value={filters.category}
            onValueChange={(value) => setFilters({ ...filters, category: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="tech">Tech Reviews</SelectItem>
              <SelectItem value="unboxing">Unboxing</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.minRating}
            onValueChange={(value) => setFilters({ ...filters, minRating: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Min AI Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="8">8+ Stars</SelectItem>
              <SelectItem value="7">7+ Stars</SelectItem>
              <SelectItem value="6">6+ Stars</SelectItem>
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
              <SelectItem value="rating">Highest Rating</SelectItem>
              <SelectItem value="earnings">Top Earners</SelectItem>
              <SelectItem value="views">Most Views</SelectItem>
              <SelectItem value="success">Success Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-white/60">
        {isLoading ? 'Loading...' : `${filteredCreators.length} creators found`}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredCreators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-white/60">No creators found</p>
            <p className="text-white/40 text-sm mt-2">
              Try adjusting your filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCreators.map((creator) => (
            <Card key={creator.address} className="hover:border-white/20 transition-colors">
              <CardContent className="pt-6">
                {/* Avatar & Name */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{creator.displayName}</h3>
                    {creator.category && (
                      <Badge variant="secondary" className="mt-1">
                        {creator.category}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-white/60 text-xs">Earned</p>
                      <p className="font-semibold">
                        ${((creator.stats?.totalEarned || 0) / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-white/60 text-xs">Views</p>
                      <p className="font-semibold">
                        {((creator.stats?.totalViews || 0) / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-white/60 text-xs">AI Rating</p>
                      <p className="font-semibold">
                        {(creator.stats?.avgAiRating || 0).toFixed(1)}/10
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-white/60 text-xs">Success</p>
                      <p className="font-semibold">
                        {creator.stats?.successRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/creator/${creator.address}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                  <Link href={`/brand/offer/${creator.address}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      Make Offer
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}