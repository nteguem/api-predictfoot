const userService = require('../services/user.service');
const ResponseService = require('../services/response.service');

const getAllUser = async (req, res, client) => {
  const role = req.query.role;
  const limit = parseInt(req.query.limit, 10) || 10; // Par défaut, limite à 10
  const offset = parseInt(req.query.offset, 10) || 0; // Par défaut, offset à 0

  const response = await userService.list(role, limit, offset, client);
  if (response.success) {
    return ResponseService.success(res, { users: response.users, total: response.total });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
};


const updateUser = async (req, res,client) => {
  const {...updatedData} = req.body;
  const phoneNumber = req.query.phoneNumber;
  const response = await userService.update(phoneNumber, updatedData);

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
  }  
 else if(response.error === "Invalid credentials" || response.error === "Access denied")
 {
  return ResponseService.unauthorized(res, { error: response.error });
 }
  else { 
    return ResponseService.notFound(res, { error: response.error });
  }
};

const loginMobile = async (req, res, client) => {
  const { phoneNumber, password } = req.body;
  const response = await userService.loginMobile(phoneNumber, password, client);
  
  if (response.success) {
    return ResponseService.success(res, { token: response.token, user: response.user });
  } else if (response.error === "Invalid credentials") {
    return ResponseService.unauthorized(res, { error: response.error });
  } else {
    return ResponseService.notFound(res, { error: response.error });
  }
};

async function addUser(req, res) {
  const response = await userService.addUser(req, res);
  return response;
}

const getOneUser = async (req, res) => {
  const phoneNumber = req.query.phoneNumber; // Récupère le numéro de téléphone depuis les paramètres de la requête.

  if (!phoneNumber) {
    return ResponseService.badRequest(res, { message: "Le numéro de téléphone est requis." });
  }

  const response = await userService.getOne(phoneNumber);

  if (response.success) {
    return ResponseService.success(res, { user: response.user });
  } else {
    return ResponseService.notFound(res, { message: response.message });
  }
};

const deleteUser = async (req, res) => {
  const phoneNumber = req.query.phoneNumber; 

  if (!phoneNumber) {
    return ResponseService.badRequest(res, { message: "Le numéro de téléphone est requis." });
  }

  const response = await userService.deleteUser(phoneNumber);

  if (response.success) {
    return ResponseService.success(res, { message: response.message, user: response.user });
  } else {
    return ResponseService.notFound(res, { message: response.message });
  }
};


module.exports = {
  getAllUser,
  login,
  updateUser,
  login,
  loginMobile,
  addUser,
  getOneUser,
  deleteUser
};
