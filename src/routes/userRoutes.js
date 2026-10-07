const express = require("express");
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

// Optionally, you can add auth middleware here if these endpoints should be protected:
// const protect = require("../middleware/authMiddleware");
// router.use(protect);

router.route("/")
  .post(createUser)
  .get(getUsers);

router.route("/:id")
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
