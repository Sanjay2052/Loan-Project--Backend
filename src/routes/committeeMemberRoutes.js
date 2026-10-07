const express = require("express");
const router = express.Router();
const { cacheMiddleware } = require("../middleware/cacheMiddleware");
const {
  createCommitteeMember,
  getCommitteeMembers,
  getCommitteeMemberById,
  updateCommitteeMember,
  deleteCommitteeMember,
} = require("../controllers/committeeMemberController");
const { getLoansByCommitteeMember } = require("../controllers/loanController");

router.route("/")
  .post(createCommitteeMember)
  .get(cacheMiddleware(30000), getCommitteeMembers);

router.route("/:id")
  .get(cacheMiddleware(30000), getCommitteeMemberById)
  .put(updateCommitteeMember)
  .delete(deleteCommitteeMember);

router.get("/:id/loans", cacheMiddleware(15000), getLoansByCommitteeMember);

module.exports = router;
