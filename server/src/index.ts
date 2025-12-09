import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared/dist";

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
});

export default app;
