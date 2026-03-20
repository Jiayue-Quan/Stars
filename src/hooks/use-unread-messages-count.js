import { useEffect, useState } from 'react';
import { subscribeToUnreadMessagesCount } from '@/lib/messages';

export function useUnreadMessagesCount(userId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    return subscribeToUnreadMessagesCount(userId, setCount);
  }, [userId]);

  return count;
}
