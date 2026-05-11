const globalForTyping = global as unknown as { typingStatuses: Map<string, number> };

export const typingStatuses = globalForTyping.typingStatuses || new Map<string, number>();

if (process.env.NODE_ENV !== 'production') {
  globalForTyping.typingStatuses = typingStatuses;
}
