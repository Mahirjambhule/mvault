import jwt from "jsonwebtoken";

export const authShield = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access Denied. Authorization token required." });
    }

    const verifiedData = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verifiedData.id;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token session." });
  }
};
