"use strict";

function plain(doc) {
  return typeof doc?.toObject === "function" ? doc.toObject() : doc;
}

/**
 * 信箱对外形状。不返回 toId/fromId，也不返回可被直接寻址的 anonymousId。
 * 非匿名信件只展示 6 位稳定化名，既保留“不是完全匿名”的语义，
 * 又不把信箱变成可反复骚扰的社交入口。
 */
function serializeMailbox(doc, { direction }) {
  const raw = plain(doc);
  if (!raw) return null;

  let counterpart;
  if (direction === "sent") {
    counterpart = { label: "一位同校同学" };
  } else if (raw.isAnonymous) {
    counterpart = { label: "匿名同学" };
  } else {
    counterpart = {
      label: raw.senderAlias ? `同校同学 · ${raw.senderAlias}` : "同校同学",
      alias: raw.senderAlias || null,
    };
  }

  return {
    id: String(raw._id),
    content: raw.content,
    isAnonymous: Boolean(raw.isAnonymous),
    direction,
    counterpart,
    threadId: String(raw.threadId),
    parentId: raw.parentId ? String(raw.parentId) : null,
    readAt: raw.readAt ? new Date(raw.readAt).toISOString() : null,
    isUnread: direction !== "sent" && !raw.readAt,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : null,
  };
}

module.exports = { serializeMailbox };
