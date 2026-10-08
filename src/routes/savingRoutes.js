const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { cacheMiddleware } = require("../middleware/cacheMiddleware");
const {
  getSavingUsers,
  getSavingsHistory,
  addSaving,
  editSaving,
  deleteSaving
} = require("../controllers/savingController");

const router = express.Router();

router.use(protect);

router.get("/", cacheMiddleware(15000), getSavingUsers);
router.get("/:userId/history", cacheMiddleware(10000), getSavingsHistory);
router.post("/:userId/add", addSaving);
router.put("/:savingId", editSaving);
router.delete("/:savingId", deleteSaving);

module.exports = router;
