import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function conversationsCollectionRef(userId) {
  return collection(db, 'userProfiles', userId, 'conversations');
}

function normalizeConversation(snapshot) {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    unreadCount: Number(data.unreadCount) || 0,
  };
}

export function subscribeToUnreadMessagesCount(userId, callback) {
  if (!userId) {
    callback(0);
    return () => {};
  }

  return onSnapshot(
    query(conversationsCollectionRef(userId), orderBy('lastMessageAt', 'desc'), limit(50)),
    (snapshot) => {
      const totalUnreadCount = snapshot.docs
        .map(normalizeConversation)
        .reduce((sum, conversation) => sum + conversation.unreadCount, 0);
      callback(totalUnreadCount);
    },
    (error) => {
      console.error('Failed to subscribe to unread messages count', error);
      callback(0);
    }
  );
}
