require("dotenv").config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require("../models/user.model");
const ResponseService = require('./response.service');
const {addLog} = require('./log.service');

async function save(phoneNumber, contactName, client) {
  try {
    const existingUser = await User.findOne({ phoneNumber: phoneNumber });
    if (existingUser == null) {
      // Case 1: User not found, create the user
      const newUser = new User({
        pseudo: contactName,
        phoneNumber: phoneNumber,
        password: process.env.DEFAULT_PASSWORD,
      });
      
      const savedUser = await newUser.save();      
      return {
        exist: false,
        data: savedUser,
        message: "User created successfully.",
      };
    } else {      
      // Case 2: User found, increment engagement
      existingUser.engagementLevel = (existingUser.engagementLevel || 0) + 1;
      await existingUser.save();
      return {
        exist: true,
        data: existingUser,
        message: "User already exist",
      }
    }
  } catch (error) {
    console.log("usercatch", error);
    
    await addLog(
      `${error.message}`,
      'save',
      'error'
    );
  }
}

async function loginMobile(phoneNumber, password, client) {
  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Pas de vérification de rôle ici - tous les utilisateurs sont acceptés
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Créez un token avec une durée de validité plus longue pour mobile
    const token = jwt.sign(
      { userId: user._id,pseudo:user.pseudo, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '40d' } 
    );
    
    return { success: true, token, user };
  } catch (error) {
    logger(client).error('Error login mobile user:', error);
    return { success: false, error: error.message };
  }
}

async function addUser(userData) {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ phoneNumber: userData.phoneNumber });
    if (existingUser) {
      return { 
        success: false, 
        statusCode: 409, // Conflict status code
        error: 'Un compte existe déjà avec ce numéro de téléphone' 
      };
    }
    
    const newUser = new User(userData);
    const user = await newUser.save();
    return { success: true, token: null, user };
  } catch (error) {
    // Gestion des erreurs de duplication (au cas où la vérification ci-dessus ne fonctionne pas)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return {
        success: false,
        statusCode: 409, // Conflict status code
        error: `Ce ${field} est déjà utilisé`
      };
    }
    
    return { 
      success: false, 
      statusCode: 500,
      error: error.message 
    };
  }
}

async function login(phoneNumber, password,client) {
  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    if (user.role !== 'admin') {
      return { success: false, error: 'Access denied' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, error: 'Invalid credentials' };
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { success: true, token, user };
  } catch (error) {
    logger(client).error('Error login user:', error);
    return { success: false, error: error.message };
  }
}


async function update(phoneNumber, updatedData) { 
  try {
    const updatedUser = await User.findOneAndUpdate(
      { phoneNumber: phoneNumber },
      { $set: updatedData },
      { new: true }  
    );
    if (updatedUser) {
      return {
        success: true,
        message: "Utilisateur mis à jour avec succès",
        user: updatedUser,
      };
    } else {
      return { success: false, message: "Utilisateur non trouvé" };
    }
  } catch (error) {
    // logger(client).error('Error update user:', error);
    return {
      success: false,
      message: "Erreur lors de la mise à jour de l'utilisateur",
    };
  }
}

async function getOne(phoneNumber) {
  try {
    const user = await User.findOne({ phoneNumber: phoneNumber })
    if (user) {
      return { success: true, user };
    } else {
      return { success: false, message: "User not found" };
    }
  } catch (error) {
    // await logService.addLog(
    //   `${error.message}`,
    //   'getOne',
    //   'error'
    // );
    return { success: false, error: error.message };
  }
}

// Liste des utilisateurs avec pagination
async function list(role, limit = 10, offset = 0) {
  try {
    const matchStage = role ? { role } : {};

    // Comptez le total des utilisateurs qui correspondent aux critères
    const totalCount = await User.countDocuments(matchStage);

    const users = await User.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "groups",
          localField: "_id",
          foreignField: "members",
          as: "groups"
        }
      },
      {
        $project: {
          pseudo: 1,
          phoneNumber: 1,
          fullname: 1,
          location: 1,
          email: 1,
          engagementLevel: 1,
          role: 1,
          referralCode: 1,
          createdAt: 1,
          updatedAt: 1,
          groups: { $map: { input: "$groups", as: "group", in: "$$group.name" } } // Map pour obtenir les noms des groupes
        }
      },
      { $skip: offset }, // Sauter les utilisateurs selon l'offset
      { $limit: limit }  // Limiter le nombre d'utilisateurs récupérés
    ]);

    return { success: true, total: totalCount, users };
  } catch (error) {
    // await logService.addLog(
    //   `${error.message}`,
    //   'list',
    //   'error'
    // );
    return { success: false, error: error.message };
  }
}


async function deleteUser(phoneNumber) {
  try {
    const deletedUser = await User.findOneAndDelete({ phoneNumber });

    if (deletedUser) {
      return {
        success: true,
        message: "User deleted successfully",
        user: deletedUser,
      };
    } else {
      return {
        success: false,
        message: "User not found or already deleted",
      };
    }
  } catch (error) {
    // await logService.addLog(
    //   `${error.message}`,
    //   'deleteUser',
    //   'error'
    // );
    return {
      success: false,
      message: "An error occurred while deleting the user",
      error: error.message,
    };
  }
}



async function getUserById(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      return user;
    } else {
      return null;
    }
  } catch (error) {
    await addLog(
      `${error.message}`,
      'getUserById',
      'error'
    );
    return null;
  }
}

module.exports = {
  save,
  login,
  loginMobile,
  list,
  update,
  deleteUser,
  getOne,
  addUser,
  getUserById
};
