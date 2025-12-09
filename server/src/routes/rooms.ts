import { Hono } from "hono";
import { supabaseAdmin } from "../lib/supabase";

export const roomsRouter = new Hono()

	// List all rooms
	.get("/", async (c) => {
		if (!supabaseAdmin) {
			return c.json({ error: "Supabase not configured" }, 500);
		}

		const { data, error } = await supabaseAdmin
			.from("rooms")
			.select("id, created_at, updated_at")
			.order("updated_at", { ascending: false })
			.limit(100);

		if (error) {
			return c.json({ error: error.message }, 500);
		}

		return c.json({ rooms: data });
	})

	// Get a specific room
	.get("/:id", async (c) => {
		if (!supabaseAdmin) {
			return c.json({ error: "Supabase not configured" }, 500);
		}

		const id = c.req.param("id");
		const { data, error } = await supabaseAdmin
			.from("rooms")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				return c.json({ error: "Room not found" }, 404);
			}
			return c.json({ error: error.message }, 500);
		}

		return c.json({ room: data });
	})

	// Delete a room
	.delete("/:id", async (c) => {
		if (!supabaseAdmin) {
			return c.json({ error: "Supabase not configured" }, 500);
		}

		const id = c.req.param("id");
		const { error } = await supabaseAdmin
			.from("rooms")
			.delete()
			.eq("id", id);

		if (error) {
			return c.json({ error: error.message }, 500);
		}

		return c.json({ success: true, message: `Room ${id} deleted` });
	})

	// Clean up old rooms (older than specified days)
	.post("/cleanup", async (c) => {
		if (!supabaseAdmin) {
			return c.json({ error: "Supabase not configured" }, 500);
		}

		const body = await c.req.json<{ days?: number }>();
		const days = body.days ?? 30;

		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		const { data, error } = await supabaseAdmin
			.from("rooms")
			.delete()
			.lt("updated_at", cutoffDate.toISOString())
			.select("id");

		if (error) {
			return c.json({ error: error.message }, 500);
		}

		return c.json({
			success: true,
			message: `Deleted ${data?.length ?? 0} rooms older than ${days} days`,
			deleted: data?.map((r) => r.id) ?? [],
		});
	});

