const Success = (res, data) => {
  return res.json({ success: true, data: data });
};

const Failure = (res, code = 500, message = "An error occured") => {
  return res.status(code).json({
    code: code,
    message: message,
  });
};

module.exports = {
  Success,
  Failure,
};
