const express = require("express");
const User = require("../models/User");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const players = await User.find()
      .sort({ wins: -1 })
      .limit(20)
      .select("username wins losses");

    res.json(players);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
