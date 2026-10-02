const express = require('express');
const { createNextlinkProxy } = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');
const router = express.Router();
router.use(
  requireJwtAuth,
  createNextlinkProxy({
    baseURL: process.env.NEXTLINK_BRIDGE_URL,
    apiKey: process.env.NEXTLINK_LIBRECHAT_KEY,
  }),
);
module.exports = router;
