# Order Service (Carrick Demo)

This service is part of a multi-repository microservice demo showcasing Carrick's ability to detect cross-repository API inconsistencies. It runs on [Fastify 5](https://fastify.dev/).

## Overview

The Order Service serves orders from an in-memory seed array on port 3002. Fetching a single order fans out to the User Service (for the embedded user) and to the Notification Service (for service status and consistency logging).

## API Endpoints

Both endpoints are GET. There are no write routes.

### List Orders
- **URL**: `/api/orders`
- **Method**: GET
- **Response**: `Order[]`
  ```typescript
  interface Order {
    id: number;
    userId: number;
    product: string;
    amount: number;
    status?: "pending" | "shipped" | "delivered";
  }
  ```

### Get Order by ID (with User Details)
- **URL**: `/api/orders/:id`
- **Method**: GET
- **Response**: declared as `OrderWithUser`
  ```typescript
  interface OrderWithUser extends Order {
    user: {
      id: number;
      name: string;
      email?: string;
    };
  }
  ```
  The body on the wire also carries a `metadata` extension that is not part of
  the declared type:
  ```jsonc
  {
    "metadata": {
      "notificationServiceStatus": "healthy",
      "totalSystemUsers": 2
    }
  }
  ```
- **404**: empty body when no order matches the id
- **500**: empty body when the User Service call fails

Serving `/api/orders/:id` makes four outbound calls:
- `GET {USER_SERVICE_URL}/api/users/:userId` — spread into `user`
- `GET {USER_SERVICE_URL}/api/users/:userId/orders` — fire-and-forget
- `GET {NOTIFICATION_SERVICE_URL}/api/notifications/status` — reads `status` and `userCount`
- `GET {NOTIFICATION_SERVICE_URL}/api/notifications/order/:id` — consistency logging only

## Configuration

Environment variables:
- `PORT` - Port to run the service on (default: 3002)
- `USER_SERVICE_URL` - URL of the User Service (default: http://localhost:3001)
- `NOTIFICATION_SERVICE_URL` - URL of the Notification Service (default: http://localhost:3003)

## Development

### Install Dependencies
```bash
npm install
```

### Start in Development Mode
```bash
npm run dev
```

### Build TypeScript
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

## Carrick Configuration

This service includes a `carrick.json` configuration file that identifies:
- Service name: `order-service`
- Depends on `USER_SERVICE_URL` and `NOTIFICATION_SERVICE_URL`
- Internal domains: `localhost:3001`, `localhost:3003`

## Type Definitions

Type definitions in the `types/` directory define the API contract for this service:
- `Order` - Basic order entity
- `OrderWithUser` - Order entity with embedded user data
- `User` - Imported from User Service to ensure compatibility
- `NotificationStatus` / `NotificationOrderDetails` - Notification Service response shapes

These type definitions are shared with other services to ensure API compatibility.
<!-- carrick: cross-repo PR-rerun test trigger -->
<!-- carrick fanout rerun test 2026-06-04 -->
Last Carrick pipeline test: 2026-07-10 (cross-repo walkthrough).
Re-scan on carrick 0.3.1 (v2 correctness batch: poison containment, wrapped-envelope, inline-literal).
Re-scan order after notification 0.3.1 stub landed (inline-literal recovery, #437).
<!-- carrick reindex 1784718194-167 (v2 verdict persistence) -->