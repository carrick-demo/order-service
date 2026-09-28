import { OrderWithUser } from "./order";

// Types for notification service responses
export interface NotificationStatus {
  service: string;
  status: string;
  timestamp: string;
  userCount?: number;
}

export interface NotificationOrderDetails {
  orderDetails: OrderWithUser;
  message: string;
}
