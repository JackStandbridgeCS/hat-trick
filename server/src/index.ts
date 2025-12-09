import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared/dist";
import { roomsRouter } from "./routes/rooms";

export const app = new Hono()

.use(cors())

.get("/", (c) => {
	return c.text("Whiteboard API Server");
})

.get("/health", async (c) => {
	const data: ApiResponse = {
		message: "Server is healthy",
		success: true,
	};

	return c.json(data, { status: 200 });
})

// Room management endpoints
.route("/api/rooms", roomsRouter);

export default app;