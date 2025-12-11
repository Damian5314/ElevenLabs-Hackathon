/**
 * Profile Route - GET/PUT /api/profile
 *
 * Handles user profile management.
 */

import { Router, Request, Response } from "express";
import { getProfile, saveProfile } from "../services/database";
import { Profile } from "../types";

const router = Router();

/**
 * GET /api/profile
 *
 * Returns the current user profile.
 */
router.get("/", (req: Request, res: Response) => {
  console.log("[API] GET /api/profile");

  try {
    const profile = getProfile();
    return res.json(profile);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to get profile:", error);

    return res.status(500).json({
      error: "Failed to get profile",
      message: errorMessage,
    });
  }
});

/**
 * PUT /api/profile
 *
 * Updates the user profile.
 * Expects JSON body with { name, email, phone }
 */
router.put("/", (req: Request, res: Response) => {
  console.log("[API] PUT /api/profile");

  try {
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Profile must include name, email, and phone",
      });
    }

    // Basic validation
    if (typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid name",
        message: "Name must be at least 2 characters",
      });
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        error: "Invalid email",
        message: "Please provide a valid email address",
      });
    }

    if (typeof phone !== "string" || phone.trim().length < 6) {
      return res.status(400).json({
        error: "Invalid phone",
        message: "Phone must be at least 6 characters",
      });
    }

    const profile: Profile = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    };

    saveProfile(profile);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed to update profile:", error);

    return res.status(500).json({
      error: "Failed to update profile",
      message: errorMessage,
    });
  }
});

export default router;
