const userService = require('../services/user.service');
const ResponseService = require('../services/response.service');

const getAllUser = async (req, res,client) => {
  const role = req.query.role;
  const response = await userService.list(role,client)
  if (response.success) {
    return ResponseService.success(res, { users: response.users,total:response.total });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
};

const updateUser = async (req, res,client) => {
  const {...updatedData} = req.body;
  const phoneNumber = req.query.phoneNumber;
  const response = await userService.update(phoneNumber, updatedData,client);

  if (response.success) {
    return ResponseService.success(res, { users: response.users });
  } else {
    return ResponseService.notFound(res, { message: response.error });
  }
}

const login = async (req, res,client) => {
  const { phoneNumber, password } = req.body;
  const response = await userService.login(phoneNumber, password,client);
  if (response.success) {
    return ResponseService.success(res, { token: response.token , user:response.user });
  } else {
    return ResponseService.unauthorized(res, { error: response.error });
  }
};

module.exports = {
  getAllUser,
  login,
  updateUser
};
