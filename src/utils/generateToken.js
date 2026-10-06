const jwt = require("jsonwebtoken");

const generateToken = (adminId) => {
  return jwt.sign(
    {
      id: adminId,
      role: "super_admin",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
};

module.exports = generateToken;
