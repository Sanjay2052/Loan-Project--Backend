const express = require("express");
const router = express.Router();
const { cacheMiddleware } = require("../middleware/cacheMiddleware");
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getLoansByUser,
} = require("../controllers/userController");

// Optionally, you can add auth middleware here if these endpoints should be protected:
// const protect = require("../middleware/authMiddleware");
// router.use(protect);

router.route("/")
  .post(createUser)
  .get(cacheMiddleware(30000), getUsers);

router.route("/:id")
  .get(cacheMiddleware(30000), getUserById)
  .put(updateUser)
  .delete(deleteUser);

router.get("/:id/loans", cacheMiddleware(15000), getLoansByUser);

module.exports = router;
