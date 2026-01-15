const express = require("express");
const { signupUser, loginUser } = require("../auth/localAuth");

const router = express.Router();

/* POST /auth/signup */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const token = await signupUser(email, password, displayName);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* POST /auth/login */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await loginUser(email, password);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
