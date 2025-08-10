import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Pin, Palette, PenTool, GitBranch, Clock, Users, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'project' | 'moodboard' | 'whiteboard' | 'workflow' | 'timeline' | 'activity';
  title: string;
  description?: string;
  url?: string;
  metadata?: {
    projectName?: string;
    createdBy?: string;
    createdAt?: string;
    status?: string;
    tags?: string[];
  };
}

interface GlobalSearchProps {
  searchTerm: string;
  searchScope: 'current' | 'global';
  currentTab: string;
  onResultClick: (result: SearchResult) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function GlobalSearch({ 
  searchTerm, 
  searchScope, 
  currentTab, 
  onResultClick, 
  isVisible, 
  onClose 
}: GlobalSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const allData = useMemo(() => [
    {
      id: 'project-1',
      type: 'project' as const,
      title: 'Nike Campaign 2024',
      description: 'Revolutionary sneaker campaign targeting Gen Z',
      metadata: {
        createdBy: 'Sarah Chen',
        createdAt: '2024-01-15',
        status: 'Active',
        tags: ['marketing', 'campaign', 'nike']
      }
    },
    {
      id: 'moodboard-1',
      type: 'moodboard' as const,
      title: 'Nike Brand Exploration',
      description: 'Visual inspiration and color palettes for Nike campaign',
      metadata: {
        projectName: 'Nike Campaign 2024',
        createdBy: 'Mike Johnson',
        createdAt: '2024-01-20',
        tags: ['branding', 'colors', 'inspiration']
      }
    },
    {
      id: 'whiteboard-1',
      type: 'whiteboard' as const,
      title: 'Nike Homepage Review',
      description: 'Feedback and annotations on homepage designs',
      metadata: {
        projectName: 'Nike Campaign 2024',
        createdBy: 'Emma Wilson',
        createdAt: '2024-01-25',
        tags: ['feedback', 'review', 'homepage']
      }
    },
    {
      id: 'workflow-1',
      type: 'workflow' as const,
      title: 'Campaign Launch Process',
      description: 'Step-by-step workflow for campaign execution',
      metadata: {
        projectName: 'Nike Campaign 2024',
        createdBy: 'Alex Turner',
        createdAt: '2024-01-18',
        tags: ['process', 'workflow', 'launch']
      }
    }
  ], []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      let filteredData = allData;

      // Filter by scope
      if (searchScope === 'current') {
        switch (currentTab) {
          case 'list':
            filteredData = allData.filter(item => item.type === 'project');
            break;
          case 'moodboards':
            filteredData = allData.filter(item => item.type === 'moodboard');
            break;
          case 'whiteboards':
            filteredData = allData.filter(item => item.type === 'whiteboard');
            break;
          case 'workflows':
            filteredData = allData.filter(item => item.type === 'workflow');
            break;
          // Add other tabs as needed
        }
      }

      // Search logic
      const searchResults = filteredData.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          item.metadata?.createdBy?.toLowerCase().includes(searchLower)
        );
      });

      setResults(searchResults);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchScope, currentTab, allData]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Calendar className="h-4 w-4" />;
      case 'moodboard': return <Palette className="h-4 w-4" />;
      case 'whiteboard': return <PenTool className="h-4 w-4" />;
      case 'workflow': return <GitBranch className="h-4 w-4" />;
      case 'timeline': return <Clock className="h-4 w-4" />;
      case 'activity': return <Users className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project': return 'bg-blue-100 text-blue-700';
      case 'moodboard': return 'bg-purple-100 text-purple-700';
      case 'whiteboard': return 'bg-green-100 text-green-700';
      case 'workflow': return 'bg-orange-100 text-orange-700';
      case 'timeline': return 'bg-red-100 text-red-700';
      case 'activity': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isVisible || !searchTerm.trim()) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-50">
      <Card className="glass-card border shadow-lg">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {searchScope === 'global' ? 'Global Search' : `Search in ${currentTab}`}
              </span>
              <Badge variant="secondary" className="text-xs">
                {results.length} results
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onResultClick(result)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", getTypeColor(result.type))}>
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{result.title}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {result.type}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {result.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {result.metadata?.projectName && (
                            <span>Project: {result.metadata.projectName}</span>
                          )}
                          {result.metadata?.createdBy && (
                            <span>by {result.metadata.createdBy}</span>
                          )}
                          {result.metadata?.createdAt && (
                            <span>{new Date(result.metadata.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {result.metadata?.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.metadata.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {result.metadata.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{result.metadata.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2" />
                <p>No results found for "{searchTerm}"</p>
                <p className="text-xs mt-1">
                  Try different keywords or check your search scope
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}