const jwt = require("jsonwebtoken")

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).send("no token")

  const token = authHeader.split(" ")[1]  // split "Bearer <token>"
  if (!token) return res.status(401).send("no token")

  try {
    const decoded = jwt.verify(token, "secretkey")
    req.user = decoded
    next()
  } catch {
    res.status(401).send("invalid token")
  }
}

module.exports = auth