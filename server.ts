import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import axios from "axios";
import dotenv from "dotenv";
import { Order, OrderWithUser } from "./types/order";
import { User } from "./types/user";
import {
  NotificationStatus,
  NotificationOrderDetails,
} from "./types/notification";

dotenv.config();

const fastify = Fastify();
const PORT = process.env.PORT || 3002;
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3001";
const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003";

// Middleware
fastify.register(cors);

// In-memory order storage
const orders: Order[] = [
  { id: 1, userId: 1, product: "Laptop", amount: 999.99, status: "shipped" },
  { id: 2, userId: 2, product: "Phone", amount: 599.99, status: "pending" },
];

// List all orders
async function listOrders(): Promise<Order[]> {
  return orders;
}

// Get order by ID (calls user service to enrich data)
async function getOrderById(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<OrderWithUser | void> {
  try {
    const orderId = parseInt((request.params as { id: string }).id);
    const order = orders.find((o) => o.id === orderId);

    if (!order) {
      reply.code(404).send();
      return;
    }

    // Call user service to get user details
    const userResponse = await axios.get<User>(
      `${USER_SERVICE_URL}/api/users/${order.userId}`,
    );

    // Best-effort call to user-service orders endpoint to avoid leaving it orphaned
    void axios
      .get<Order[]>(`${USER_SERVICE_URL}/api/users/${order.userId}/orders`)
      .catch((error) => console.warn("Failed to fetch user orders:", error));

    const user = userResponse.data;

    const orderWithUser: OrderWithUser = {
      ...order,
      user: user,
    };

    // Call notification service to check status and get user count
    let serviceStatus = "unknown";
    let totalUsers = 0;
    try {
      const statusResponse = await axios.get<NotificationStatus>(
        `${NOTIFICATION_SERVICE_URL}/api/notifications/status`,
      );
      serviceStatus = statusResponse.data.status;
      totalUsers = statusResponse.data.userCount || 0;
      console.log(
        `Notification service status: ${serviceStatus}, users: ${totalUsers}`,
      );
    } catch (error) {
      console.warn("Notification service unavailable:", error);
    }

    // Call notification service to log order retrieval and verify data consistency
    try {
      const orderNotificationResponse =
        await axios.get<NotificationOrderDetails>(
          `${NOTIFICATION_SERVICE_URL}/api/notifications/order/${orderId}`,
        );
      const notificationOrderData = orderNotificationResponse.data.orderDetails;

      // Verify data consistency between services
      if (notificationOrderData.id !== orderWithUser.id) {
        console.warn(
          `Order ID mismatch: expected ${orderWithUser.id}, got ${notificationOrderData.id}`,
        );
      }
      if (notificationOrderData.user.email !== orderWithUser.user.email) {
        console.warn(`User email mismatch for order ${orderId}`);
      }

      console.log(
        `Order retrieval logged: ${orderNotificationResponse.data.message}`,
      );
    } catch (error) {
      console.warn("Failed to log order retrieval:", error);
    }

    // Add metadata about service interactions to response
    const enrichedResponse: OrderWithUser & {
      metadata?: {
        notificationServiceStatus: string;
        totalSystemUsers: number;
      };
    } = {
      ...orderWithUser,
      metadata: {
        notificationServiceStatus: serviceStatus,
        totalSystemUsers: totalUsers,
      },
    };

    return enrichedResponse;
  } catch (error) {
    reply.code(500).send();
    return;
  }
}

fastify.get("/api/orders", listOrders);
fastify.get("/api/orders/:id", getOrderById);

fastify.listen({ port: Number(PORT) }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Order Service running on port ${PORT}`);
});

export default fastify;
