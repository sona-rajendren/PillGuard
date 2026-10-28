const { validationResult } = require('express-validator');
module.exports = (req, res, next) => {
  const e = validationResult(req);
  if (e.isEmpty()) return next();
  res.status(422).json({ message: e.array()[0].msg, errors: e.array().map((x) => ({ field: x.path, msg: x.msg })) });
};
