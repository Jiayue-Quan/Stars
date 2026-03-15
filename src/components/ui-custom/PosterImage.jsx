import { memo, useMemo, useState } from 'react';
import { getPosterFallback, resolvePosterUrl } from '@/lib/posters';
export const PosterImage = memo(function PosterImage({ src, title, className, width, height, loading, sizes, fetchPriority, }) {
    const resolvedSrc = useMemo(() => resolvePosterUrl(src, title, { width, height }), [height, src, title, width]);
    const [failedSrc, setFailedSrc] = useState(null);
    const currentSrc = useMemo(() => (failedSrc === resolvedSrc ? getPosterFallback(title, { width, height }) : resolvedSrc), [failedSrc, height, resolvedSrc, title, width]);
    return (<img src={currentSrc} alt={title} className={className} loading={loading ?? 'lazy'} decoding="async" width={width} height={height} sizes={sizes} fetchPriority={fetchPriority} onError={() => setFailedSrc(resolvedSrc)}/>);
});
