const express = require("express");
const router = express.Router();
const { cacheMiddleware } = require("../middleware/cacheMiddleware");
const {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
} = require("../controllers/memberController");

router.route("/")
  .post(createMember)
  .get(cacheMiddleware(30000), getMembers);

router.route("/:id")
  .get(cacheMiddleware(30000), getMemberById)
  .put(updateMember)
  .delete(deleteMember);

module.exports = router;
