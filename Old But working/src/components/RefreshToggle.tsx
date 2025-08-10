import React from 'react';
import { Button } from './ui/button';
import { RotateCcw, Play, Pause } from 'lucide-react';

interface RefreshToggleProps {
  autoRefresh: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function RefreshToggle({ autoRefresh, onToggle, className, size = 'sm' }: RefreshToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant={autoRefresh ? "default" : "outline"}
        size={size}
        onClick={() => onToggle(!autoRefresh)}
        className="flex items-center gap-2"
      >
        {autoRefresh ? (
          <>
            <Pause className="h-4 w-4" />
            5s Auto
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4" />
            Manual
          </>
        )}
      </Button>
    </div>
  );
}