const express = require("express");
const router = express.Router();
const {
  createCommitteeMember,
  getCommitteeMembers,
  getCommitteeMemberById,
  updateCommitteeMember,
  deleteCommitteeMember,
} = require("../controllers/committeeMemberController");

router.route("/")
  .post(createCommitteeMember)
  .get(getCommitteeMembers);

router.route("/:id")
  .get(getCommitteeMemberById)
  .put(updateCommitteeMember)
  .delete(deleteCommitteeMember);

module.exports = router;
