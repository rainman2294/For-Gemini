import { useCallback, useMemo, useState, useEffect } from 'react';
import { FixedSizeList as List, VariableSizeList } from 'react-window';

export interface VirtualizationOptions {
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  threshold?: number;
  getItemSize?: (index: number) => number;
}

export interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactElement;
  options?: VirtualizationOptions;
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions = {}
) {
  const {
    itemHeight = 80,
    containerHeight = 400,
    overscan = 5,
    threshold = 100,
    getItemSize
  } = options;

  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: containerHeight });

  // Determine if virtualization should be enabled
  const shouldVirtualize = useMemo(() => {
    return items.length > threshold;
  }, [items.length, threshold]);

  // Update container dimensions
  useEffect(() => {
    if (!containerRef) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height || containerHeight,
        });
      }
    });

    resizeObserver.observe(containerRef);
    return () => resizeObserver.disconnect();
  }, [containerRef, containerHeight]);

  const VirtualizedList = useCallback(
    ({ renderItem }: { renderItem: VirtualizedListProps<T>['renderItem'] }) => {
      if (!shouldVirtualize) {
        return (
          <div ref={setContainerRef} style={{ height: containerHeight }}>
            {items.map((item, index) => (
              <div key={index}>
                {renderItem({
                  index,
                  style: {},
                  data: items,
                })}
              </div>
            ))}
          </div>
        );
      }

      if (getItemSize) {
        return (
          <VariableSizeList
            ref={setContainerRef as any}
            height={dimensions.height}
            width={dimensions.width}
            itemCount={items.length}
            itemSize={getItemSize as any}
            itemData={items}
            overscanCount={overscan}
          >
            {renderItem as any}
          </VariableSizeList>
        );
      }

      return (
        <List
          ref={setContainerRef as any}
          height={dimensions.height}
          width={dimensions.width}
          itemCount={items.length}
          itemSize={itemHeight}
          itemData={items}
          overscanCount={overscan}
        >
          {renderItem as any}
        </List>
      );
    },
    [
      shouldVirtualize,
      items,
      dimensions,
      itemHeight,
      overscan,
      getItemSize,
      containerHeight,
    ]
  );

  return {
    VirtualizedList,
    shouldVirtualize,
    dimensions,
    setContainerRef,
  };
}

// Hook for infinite loading with virtualization
export function useInfiniteVirtualization<T>(
  items: T[],
  loadMore: () => Promise<void>,
  hasNextPage: boolean,
  options: VirtualizationOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const { VirtualizedList, shouldVirtualize } = useVirtualization(items, options);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasNextPage) return;
    setIsLoading(true);
    try {
      await loadMore();
    } finally {
      setIsLoading(false);
    }
  }, [loadMore, hasNextPage, isLoading]);

  const InfiniteVirtualizedList = useCallback(
    ({ renderItem }: { renderItem: VirtualizedListProps<T>['renderItem'] }) => {
      const itemCount = hasNextPage ? items.length + 1 : items.length;

      const Item = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const isLoadingItem = index === items.length;
        if (isLoadingItem) {
          useEffect(() => {
            handleLoadMore();
          }, []);
          return (
            <div style={style} className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          );
        }
        return renderItem({ index, style, data: items });
      };

      if (!shouldVirtualize) {
        return (
          <div>
            {items.map((item, index) => (
              <div key={index}>
                {renderItem({ index, style: {}, data: items })}
              </div>
            ))}
            {hasNextPage && (
              <div className="flex items-center justify-center p-4">
                <button onClick={handleLoadMore} disabled={isLoading} className="btn-glass-primary">
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        );
      }

      return (
        <List
          height={options.containerHeight || 400}
          itemCount={itemCount}
          itemSize={options.itemHeight || 80}
          itemData={items}
          overscanCount={options.overscan || 5}
        >
          {Item as any}
        </List>
      );
    },
    [items, hasNextPage, shouldVirtualize, handleLoadMore, isLoading, options]
  );

  return {
    InfiniteVirtualizedList,
    isLoading,
    loadMore: handleLoadMore,
  };
}

// Hook for memoized and optimized rendering
export function useOptimizedRender<T>(
  items: T[],
  dependencies: any[] = []
) {
  const memoizedItems = useMemo(() => items, [items, ...dependencies]);
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const startIndex = 0;
    const endIndex = page * itemsPerPage;
    setVisibleItems(memoizedItems.slice(startIndex, endIndex));
  }, [memoizedItems, page]);

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const hasMore = useMemo(() => {
    return visibleItems.length < memoizedItems.length;
  }, [visibleItems.length, memoizedItems.length]);

  const reset = useCallback(() => {
    setPage(1);
    setVisibleItems(memoizedItems.slice(0, itemsPerPage));
  }, [memoizedItems]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    reset,
    totalItems: memoizedItems.length,
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [renderTimes, setRenderTimes] = useState<number[]>([]);

  useEffect(() => {
    const startTime = performance.now();
    setRenderCount(prev => prev + 1);

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      setRenderTimes(prev => {
        const newTimes = [...prev, renderTime];
        return newTimes.slice(-10);
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCount + 1}: ${renderTime.toFixed(2)}ms`);
        if (renderTimes.length >= 5) {
          const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
          if (avgRenderTime > 16) {
            console.warn(`${componentName} average render time (${avgRenderTime.toFixed(2)}ms) exceeds 16ms threshold`);
          }
        }
      }
    };
  });

  const getPerformanceStats = useCallback(() => {
    if (renderTimes.length === 0) return null;
    const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    const maxRenderTime = Math.max(...renderTimes);
    const minRenderTime = Math.min(...renderTimes);
    return { renderCount, avgRenderTime: Number(avgRenderTime.toFixed(2)), maxRenderTime: Number(maxRenderTime.toFixed(2)), minRenderTime: Number(minRenderTime.toFixed(2)), recentRenderTimes: renderTimes };
  }, [renderCount, renderTimes]);

  return { renderCount, getPerformanceStats };
}