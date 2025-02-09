function success(res, data = null) {
    return res.status(200).json({
      status: 200,
      message: "Success",
      data: data
    });
  }
  
  function created(res, data = null) {
    return res.status(201).json({
      status: 201,
      message: "Created",
      data: data
    });
  }
  
  function badRequest(res, message = "Bad Request") {
    return res.status(400).json({
      status: 400,
      message: message
    });
  }
  
  function unauthorized(res, message = "Unauthorized") {
    return res.status(401).json({
      status: 401,
      message: message
    });
  }
  
  function forbidden(res, message = "Forbidden") {
    return res.status(403).json({
      status: 403,
      message: message
    });
  }
  
  function notFound(res, message = "Not Found") {
    return res.status(404).json({
      status: 404,
      message: message
    });
  }
  
  function internalServerError(res, message = "Internal Server Error") {
    return res.status(500).json({
      status: 500,
      message: message
    });
  }
  
  module.exports = {
    success,
    created,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    internalServerError
  };
  