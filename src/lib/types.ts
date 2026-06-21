/** Notification shape passed to client components (dates serialised). */
export type ClientNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

/** Swap request flattened for client rendering. */
export type ClientSwap = {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  requesterId: string;
  targetTeacherId: string;
  cancelRequestedById: string | null;
  requesterName: string;
  targetTeacherName: string;
  sourceLabel: string;
  targetLabel: string;
};
