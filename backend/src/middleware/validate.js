function validate(schema) {
  return (req, res, next) => {
    // safeParse tidak throw error — kembalikan {success, data, error}
    const result = schema.safeParse({
      params: req.params,
      query:  req.query,
      body:   req.body,
    });

    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ errors });
    }

    req.validated = result.data;
    next();
  };
}

module.exports = validate;
