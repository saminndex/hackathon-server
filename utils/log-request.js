const logRequestDetails = (req, res, next) => {
  try {
    console.info(`${req.ip}: ${req.originalUrl}, body: ${req.body}`);
  } catch (error) {
    console.error("Error logging request details:", error);
  }
  next();
};

module.exports = logRequestDetails;
