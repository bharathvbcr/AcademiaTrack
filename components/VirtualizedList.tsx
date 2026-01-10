import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Application } from '../types';

interface VirtualizedListProps {
  items: Application[];
  itemHeight?: number;
  renderItem: (item: Application, index: number, style?: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  layout?: 'list' | 'grid';
  gridGap?: number;
  minItemWidth?: number;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  itemHeight = 200,
  renderItem,
  overscan = 5,
  layout = 'list',
  gridGap = 16, // 1rem
  minItemWidth = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1000); // Default, will update
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    container.addEventListener('scroll', handleScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Calculate Grid Dimensions
  const columns = useMemo(() => {
    if (layout === 'list') return 1;
    // Calculate how many columns fit
    // Width = col * itemWidth + (col-1) * gap
    // Approximation: width / (minItemWidth + gap)
    const cols = Math.floor((containerWidth + gridGap) / (minItemWidth + gridGap));
    return Math.max(1, cols);
  }, [layout, containerWidth, gridGap, minItemWidth]);

  const itemWidth = useMemo(() => {
    if (layout === 'list') return '100%';
    // (ContainerWidth - (cols - 1) * gap) / cols
    const width = (containerWidth - (columns - 1) * gridGap) / columns;
    return width;
  }, [layout, containerWidth, columns, gridGap]);

  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * (itemHeight + gridGap) - gridGap;

  const rowHeight = itemHeight + gridGap;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    totalRows - 1,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleRows = useMemo(() => {
    const rows = [];
    for (let i = startIndex; i <= endIndex; i++) {
      rows.push(i);
    }
    return rows;
  }, [startIndex, endIndex]);

  const containerStyle: React.CSSProperties = {
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  const innerStyle: React.CSSProperties = {
    height: Math.max(totalHeight, containerHeight), // Ensure at least container height
    position: 'relative',
    width: '100%',
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="relative w-full h-[calc(100vh-200px)] min-h-[400px]" // Fallback height
    >
      <div style={innerStyle}>
        {visibleRows.map(rowIndex => {
          const rowTop = rowIndex * rowHeight;
          const itemStartIndex = rowIndex * columns;

          // Render items in this row
          const rowItems = [];
          for (let col = 0; col < columns; col++) {
            const itemIndex = itemStartIndex + col;
            if (itemIndex >= items.length) break;

            const item = items[itemIndex];
            const itemLeft = col * (itemWidth as number + gridGap);

            const itemStyle: React.CSSProperties = {
              position: 'absolute',
              top: rowTop,
              left: layout === 'list' ? 0 : itemLeft,
              width: typeof itemWidth === 'number' ? `${itemWidth}px` : itemWidth,
              height: itemHeight,
            };

            rowItems.push(renderItem(item, itemIndex, itemStyle));
          }

          return <React.Fragment key={rowIndex}>{rowItems}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

export default VirtualizedList;
