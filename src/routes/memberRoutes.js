const express = require("express");
const router = express.Router();
const {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
} = require("../controllers/memberController");

router.route("/")
  .post(createMember)
  .get(getMembers);

router.route("/:id")
  .get(getMemberById)
  .put(updateMember)
  .delete(deleteMember);

module.exports = router;
