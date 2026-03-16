import { useEffect, useState } from 'react';
import { subscribeToMovieFeedback } from '@/lib/movie-feedback';

const emptyFeedback = Object.freeze({
  entries: [],
  ratings: [],
  reviews: [],
  spoilers: [],
  totalRatings: 0,
  totalReviews: 0,
  averageRating: null,
  ratingBreakdown: Array.from({ length: 10 }, (_, index) => ({ rating: 10 - index, count: 0 })),
});

export function useMovieFeedback(movieId) {
  const [state, setState] = useState({
    movieId: null,
    feedback: emptyFeedback,
  });

  useEffect(() => {
    return subscribeToMovieFeedback(movieId, (feedback) => {
      setState({
        movieId,
        feedback,
      });
    });
  }, [movieId]);

  const isLoading = state.movieId !== movieId;

  return {
    isLoading,
    feedback: isLoading ? emptyFeedback : state.feedback,
  };
}
